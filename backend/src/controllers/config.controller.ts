import type { Request, Response } from "express";

import { env } from "../config/env.js";

export function getPublicConfig(_request: Request, response: Response) {
  response.json({
    config: {
      defaultImageQuota: env.defaultImageQuota,
      slotPackSize: env.slotPackSize,
      slotPackPriceInr: env.slotPackPriceInr,
      maxSlotPacksPerOrder: env.maxSlotPacksPerOrder,
      maxAdminSlotAllocation: env.maxAdminSlotAllocation,
      maxUserImageQuota: env.maxUserImageQuota,
      maxTagsPerImage: env.maxTagsPerImage,
      maxFileSize: env.maxFileSize,
      notificationPollIntervalMs: env.notificationPollIntervalMs,
      passwordMinLength: env.passwordMinLength,
      passwordMaxLength: env.passwordMaxLength,
      pushEnabled: Boolean(env.vapidPublicKey && env.vapidPrivateKey && env.vapidSubject),
      vapidPublicKey: env.vapidPublicKey ?? null,
    },
  });
}
