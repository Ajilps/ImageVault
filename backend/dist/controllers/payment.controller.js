import { AppError } from "../errors/appError.js";
import { createPaymentOrder, listPayments, processPaymentWebhook, verifyCheckoutPayment, } from "../services/payment.service.js";
function authenticatedUser(request) {
    if (!request.auth) {
        throw new AppError("Authentication is required.", 401, "AUTHENTICATION_REQUIRED");
    }
    return request.auth;
}
export async function postPaymentOrder(request, response) {
    const order = await createPaymentOrder(authenticatedUser(request), request.body.slotPacks);
    response.status(201).json({ order });
}
export async function postVerifyPayment(request, response) {
    const payment = await verifyCheckoutPayment(authenticatedUser(request), request.body);
    response.json({ payment });
}
export async function postPaymentWebhook(request, response) {
    if (!Buffer.isBuffer(request.body)) {
        throw new AppError("The Razorpay webhook must use an application/json raw body.", 400, "INVALID_WEBHOOK_BODY");
    }
    const result = await processPaymentWebhook(request.body, request.header("x-razorpay-signature") ?? undefined);
    response.status(200).json(result);
}
export async function getPaymentHistory(request, response) {
    response.json({ payments: await listPayments(authenticatedUser(request)) });
}
