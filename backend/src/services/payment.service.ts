import { createHmac, timingSafeEqual } from "node:crypto";

import Razorpay from "razorpay";

import { env } from "../config/env.js";
import { AppError } from "../errors/appError.js";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedUser } from "./auth.service.js";

const SLOT_PACK_SIZE = 5;
const SLOT_PACK_PRICE_INR = 100;

function organizationIdFor(user: AuthenticatedUser): string {
  if (!user.organizationId) {
    throw new AppError("You must belong to an organisation to make a payment.", 403, "ORGANISATION_REQUIRED");
  }

  return user.organizationId;
}

function getRazorpayClient() {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    throw new AppError("Razorpay is not configured.", 503, "PAYMENTS_UNAVAILABLE");
  }

  return new Razorpay({
    key_id: env.razorpayKeyId,
    key_secret: env.razorpayKeySecret,
  });
}

function hasValidSignature(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");

  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

async function markPaymentSuccessful(transactionId: string, userId?: string) {
  return prisma.$transaction(async (transaction) => {
    const payment = await transaction.payment.findUnique({
      where: { transactionId },
    });

    if (!payment) {
      throw new AppError("Payment order not found.", 404, "PAYMENT_NOT_FOUND");
    }

    if (userId && payment.userId !== userId) {
      throw new AppError("This payment order does not belong to the current user.", 403, "FORBIDDEN");
    }

    if (payment.status === "SUCCESS") {
      return payment;
    }

    if (payment.status === "FAILED") {
      throw new AppError("This payment was previously marked as failed.", 409, "PAYMENT_FAILED");
    }

    const updated = await transaction.payment.updateMany({
      where: {
        id: payment.id,
        status: "PENDING",
      },
      data: { status: "SUCCESS" },
    });

    if (updated.count === 1) {
      await transaction.user.update({
        where: { id: payment.userId },
        data: {
          imageQuota: {
            increment: payment.slotsPurchased,
          },
        },
      });
    }

    return transaction.payment.findUniqueOrThrow({ where: { id: payment.id } });
  });
}

export async function createPaymentOrder(user: AuthenticatedUser, slotPacks: number) {
  const organizationId = organizationIdFor(user);
  const amountInRupees = slotPacks * SLOT_PACK_PRICE_INR;
  const slotsPurchased = slotPacks * SLOT_PACK_SIZE;
  const razorpay = getRazorpayClient();

  const order = await razorpay.orders.create({
    amount: amountInRupees * 100,
    currency: "INR",
    receipt: `slots_${user.id.slice(0, 8)}_${Date.now()}`,
    notes: {
      userId: user.id,
      organizationId,
      slotsPurchased: String(slotsPurchased),
    },
  });

  if (!order.id) {
    throw new AppError("Razorpay did not return an order ID.", 502, "PAYMENT_PROVIDER_ERROR");
  }

  await prisma.payment.create({
    data: {
      userId: user.id,
      organizationId,
      amount: amountInRupees,
      slotsPurchased,
      transactionId: order.id,
      status: "PENDING",
    },
  });

  return {
    orderId: order.id,
    amount: amountInRupees * 100,
    currency: "INR",
    keyId: env.razorpayKeyId,
    slotsPurchased,
  };
}

export async function verifyCheckoutPayment(
  user: AuthenticatedUser,
  input: { orderId: string; paymentId: string; signature: string },
) {
  if (!env.razorpayKeySecret) {
    throw new AppError("Razorpay is not configured.", 503, "PAYMENTS_UNAVAILABLE");
  }

  const expectedSignature = createHmac("sha256", env.razorpayKeySecret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");

  if (!hasValidSignature(expectedSignature, input.signature)) {
    throw new AppError("The Razorpay payment signature is invalid.", 400, "INVALID_PAYMENT_SIGNATURE");
  }

  return markPaymentSuccessful(input.orderId, user.id);
}

export async function processPaymentWebhook(rawBody: Buffer, signature?: string) {
  if (!env.razorpayWebhookSecret) {
    throw new AppError("RAZORPAY_WEBHOOK_SECRET is not configured.", 503, "PAYMENTS_UNAVAILABLE");
  }

  if (!signature) {
    throw new AppError("Missing Razorpay webhook signature.", 400, "INVALID_WEBHOOK_SIGNATURE");
  }

  const expectedSignature = createHmac("sha256", env.razorpayWebhookSecret).update(rawBody).digest("hex");

  if (!hasValidSignature(expectedSignature, signature)) {
    throw new AppError("The Razorpay webhook signature is invalid.", 400, "INVALID_WEBHOOK_SIGNATURE");
  }

  const payload = JSON.parse(rawBody.toString("utf8")) as {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          order_id?: string;
        };
      };
    };
  };
  const orderId = payload.payload?.payment?.entity?.order_id;

  if (!orderId) {
    return { processed: false };
  }

  if (payload.event === "payment.captured" || payload.event === "order.paid") {
    await markPaymentSuccessful(orderId);
    return { processed: true, status: "SUCCESS" };
  }

  if (payload.event === "payment.failed") {
    await prisma.payment.updateMany({
      where: {
        transactionId: orderId,
        status: "PENDING",
      },
      data: { status: "FAILED" },
    });
    return { processed: true, status: "FAILED" };
  }

  return { processed: false };
}

export async function listPayments(user: AuthenticatedUser) {
  return prisma.payment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
}
