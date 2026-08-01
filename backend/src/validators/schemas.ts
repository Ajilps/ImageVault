import { z } from "zod";

const password = z.string().min(8).max(128);
const name = z.string().trim().min(1).max(120);
const email = z.string().trim().email().max(255);

export const userIdParamsSchema = z.object({
  userId: z.string().uuid(),
});

export const organisationIdParamsSchema = z.object({
  organisationId: z.string().uuid(),
});

export const registerSchema = z.object({
  name,
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1),
});

export const createOrganisationSchema = z.object({
  name,
  logoUrl: z.string().url().max(2048),
  address: z.string().trim().min(1).max(500),
  phone: z.string().trim().min(5).max(40),
  admin: z.object({
    name,
    email,
    password,
  }),
});

export const updateOrganisationSchema = z
  .object({
    name: name.optional(),
    logoUrl: z.string().url().max(2048).optional(),
    address: z.string().trim().min(1).max(500).optional(),
    phone: z.string().trim().min(5).max(40).optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "Provide at least one field to update.",
  });

export const createUserSchema = z.object({
  name,
  email,
  password,
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

export const requestUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().startsWith("image/"),
});

export const completeUploadSchema = z.object({
  objectKey: z.string().trim().min(1).max(2048),
  tagUserIds: z.array(z.string().uuid()).max(50).default([]),
});

export const imageQuerySchema = z.object({
  taggedUserId: z.string().uuid().optional(),
});

export const createPaymentOrderSchema = z.object({
  slotPacks: z.coerce.number().int().min(1).max(20),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().trim().min(1),
  paymentId: z.string().trim().min(1),
  signature: z.string().trim().min(1),
});
