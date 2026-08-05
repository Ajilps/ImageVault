import assert from "node:assert/strict";
import test from "node:test";

import {
  completeUploadSchema,
  allocateUserSlotsSchema,
  changeOwnPasswordSchema,
  createOrganisationSchema,
  createPaymentOrderSchema,
  createUserSchema,
  updateUserSchema,
  pushSubscriptionSchema,
  publicShareTokenParamsSchema,
} from "./schemas.js";
import { env } from "../config/env.js";

test("organisation setup requires a valid initial Admin", () => {
  const result = createOrganisationSchema.safeParse({
    name: "Northstar Studio",
    logoUrl: "https://example.com/logo.png",
    address: "12 Market Street",
    phone: "+91 90000 00000",
    admin: { name: "Ada Admin", email: "ada@example.com" },
  });

  assert.equal(result.success, true);
  assert.equal(createOrganisationSchema.safeParse({
    name: "No Logo Studio",
    address: "12 Market Street",
    phone: "+91 90000 00000",
    admin: { name: "Ada Admin", email: "ada@example.com" },
  }).success, true);
  assert.equal(createOrganisationSchema.safeParse({ ...result.data, logoUrl: "not-a-url" }).success, false);
  assert.equal(createOrganisationSchema.safeParse({ ...result.data, admin: { ...result.data.admin, email: "not-an-email" } }).success, false);
});

test("payment packs are positive integers within the supported purchase limit", () => {
  assert.equal(createPaymentOrderSchema.safeParse({ slotPacks: 1 }).success, true);
  assert.equal(createPaymentOrderSchema.safeParse({ slotPacks: 0 }).success, false);
  assert.equal(createPaymentOrderSchema.safeParse({ slotPacks: 1.5 }).success, false);
  assert.equal(createPaymentOrderSchema.safeParse({ slotPacks: env.maxSlotPacksPerOrder }).success, true);
  assert.equal(createPaymentOrderSchema.safeParse({ slotPacks: env.maxSlotPacksPerOrder + 1 }).success, false);
});

test("an upload accepts valid organisation member UUIDs", () => {
  const validId = "2d6be3db-8aa1-4d6d-8242-79e7118d0e5c";
  assert.equal(completeUploadSchema.safeParse({ objectKey: "organisations/acme/users/user/image.png", tagUserIds: [validId], visibility: "PUBLIC" }).success, true);
  assert.equal(completeUploadSchema.safeParse({ objectKey: "", tagUserIds: [] }).success, false);
  assert.equal(completeUploadSchema.safeParse({ objectKey: "image.png", tagUserIds: ["not-a-uuid"] }).success, false);
  assert.equal(completeUploadSchema.safeParse({ objectKey: "image.png", tagUserIds: [], visibility: "PRIVATE" }).success, true);
  assert.equal(completeUploadSchema.safeParse({ objectKey: "image.png", tagUserIds: [validId], visibility: "PRIVATE" }).success, false);
});

test("password changes and Admin slot allocations follow configured limits", () => {
  const validPassword = "x".repeat(env.passwordMinLength);
  assert.equal(changeOwnPasswordSchema.safeParse({ currentPassword: "current-password", newPassword: validPassword }).success, true);
  assert.equal(changeOwnPasswordSchema.safeParse({ currentPassword: validPassword, newPassword: validPassword }).success, false);
  assert.equal(allocateUserSlotsSchema.safeParse({ additionalSlots: env.maxAdminSlotAllocation }).success, true);
  assert.equal(allocateUserSlotsSchema.safeParse({ additionalSlots: env.maxAdminSlotAllocation + 1 }).success, false);
  assert.equal(allocateUserSlotsSchema.safeParse({ additionalSlots: 0 }).success, false);
});

test("public image share tokens use the configured entropy length and URL-safe alphabet", () => {
  const validToken = Buffer.alloc(env.publicShareTokenBytes, 7).toString("base64url");
  assert.equal(publicShareTokenParamsSchema.safeParse({ shareToken: validToken }).success, true);
  assert.equal(publicShareTokenParamsSchema.safeParse({ shareToken: `${validToken}!` }).success, false);
  assert.equal(publicShareTokenParamsSchema.safeParse({ shareToken: validToken.slice(1) }).success, false);
});

test("tag and password validation follows environment configuration", () => {
  const validId = "2d6be3db-8aa1-4d6d-8242-79e7118d0e5c";
  assert.equal(completeUploadSchema.safeParse({ objectKey: "image.png", tagUserIds: Array(env.maxTagsPerImage).fill(validId) }).success, true);
  assert.equal(completeUploadSchema.safeParse({ objectKey: "image.png", tagUserIds: Array(env.maxTagsPerImage + 1).fill(validId) }).success, false);
  assert.equal(updateUserSchema.safeParse({ password: "x".repeat(env.passwordMinLength) }).success, true);
  assert.equal(updateUserSchema.safeParse({ password: "x".repeat(env.passwordMinLength - 1) }).success, false);
});

test("push subscriptions require a complete browser subscription", () => {
  assert.equal(pushSubscriptionSchema.safeParse({
    endpoint: "https://push.example.test/subscription",
    expirationTime: null,
    keys: { p256dh: "public-key", auth: "auth-secret" },
  }).success, true);
  assert.equal(pushSubscriptionSchema.safeParse({ endpoint: "not-a-url", keys: {} }).success, false);
});

test("user updates require at least one valid field", () => {
  assert.equal(updateUserSchema.safeParse({}).success, false);
  assert.equal(updateUserSchema.safeParse({ name: "New name" }).success, true);
  assert.equal(updateUserSchema.safeParse({ password: "short" }).success, false);
});

test("new Admin and User account requests contain only their identity details", () => {
  assert.equal(createOrganisationSchema.safeParse({
    name: "Northstar Studio",
    logoUrl: "https://example.com/logo.png",
    address: "12 Market Street",
    phone: "+91 90000 00000",
    admin: { name: "Ada Admin", email: "ada@example.com" },
  }).success, true);
  assert.equal(createUserSchema.safeParse({ name: "Uma User", email: "uma@example.com" }).success, true);
  assert.equal(createUserSchema.safeParse({ name: "Uma User", email: "not-an-email" }).success, false);
});
