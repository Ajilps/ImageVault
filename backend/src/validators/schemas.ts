import { z } from "zod";

import { env } from "../config/env.js";

const password = z.string().min(env.passwordMinLength).max(env.passwordMaxLength);
const name = z.string().trim().min(1).max(env.nameMaxLength);
const email = z.string().trim().email().max(env.emailMaxLength);
const logoUrl = z.union([z.string().url().max(env.urlMaxLength), z.literal("")]);

export const userIdParamsSchema = z.object({
  userId: z.string().uuid(),
});

export const imageIdParamsSchema = z.object({
  imageId: z.string().uuid(),
});

export const notificationIdParamsSchema = z.object({
  notificationId: z.string().uuid(),
});

const publicShareTokenLength = Buffer.alloc(env.publicShareTokenBytes).toString("base64url").length;

export const publicShareTokenParamsSchema = z.object({
  shareToken: z.string().regex(new RegExp(`^[A-Za-z0-9_-]{${publicShareTokenLength}}$`)),
});

export const organisationIdParamsSchema = z.object({
  organisationId: z.string().uuid(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1),
});

export const changeOwnPasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: password,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "The new password must be different from the current password.",
    path: ["newPassword"],
  });

export const resetAccountPasswordSchema = z.object({
  newPassword: password,
});

export const createOrganisationSchema = z.object({
  name,
  logoUrl: logoUrl.optional(),
  address: z.string().trim().min(1).max(env.addressMaxLength),
  phone: z.string().trim().min(env.phoneMinLength).max(env.phoneMaxLength),
  admin: z.object({
    name,
    email,
  }),
});

export const updateOrganisationSchema = z
  .object({
    name: name.optional(),
    logoUrl: logoUrl.optional(),
    address: z.string().trim().min(1).max(env.addressMaxLength).optional(),
    phone: z.string().trim().min(env.phoneMinLength).max(env.phoneMaxLength).optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "Provide at least one field to update.",
  });

export const createUserSchema = z.object({
  name,
  email,
});

export const updateUserSchema = z
  .object({
    name: name.optional(),
    email: email.optional(),
    password: password.optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "Provide at least one field to update.",
  });

export const allocateUserSlotsSchema = z.object({
  additionalSlots: z.coerce.number().int().min(1).max(env.maxAdminSlotAllocation),
});

export const requestUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(env.fileNameMaxLength),
  contentType: z.string().trim().startsWith("image/"),
});

export const completeUploadSchema = z
  .object({
    objectKey: z.string().trim().min(1).max(env.objectKeyMaxLength),
    tagUserIds: z.array(z.string().uuid()).max(env.maxTagsPerImage).default([]),
    visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
  })
  .superRefine((value, context) => {
    if (value.visibility === "PRIVATE" && value.tagUserIds.length) {
      context.addIssue({
        code: "custom",
        message: "Private images cannot tag other users.",
        path: ["tagUserIds"],
      });
    }
  });

export const imageQuerySchema = z.object({
  taggedUserId: z.string().uuid().optional(),
});

export const createPaymentOrderSchema = z.object({
  slotPacks: z.coerce.number().int().min(1).max(env.maxSlotPacksPerOrder),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(env.urlMaxLength),
  expirationTime: z.number().nonnegative().nullable().default(null),
  keys: z.object({
    p256dh: z.string().trim().min(1).max(env.urlMaxLength),
    auth: z.string().trim().min(1).max(env.urlMaxLength),
  }),
});

export const deletePushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(env.urlMaxLength),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().trim().min(1),
  paymentId: z.string().trim().min(1),
  signature: z.string().trim().min(1),
});
