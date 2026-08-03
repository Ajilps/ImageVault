import type { Request, Response } from "express";

import { AppError } from "../errors/appError.js";
import { getPublicSharedImage } from "../services/user.service.js";
import { publicShareTokenParamsSchema } from "../validators/schemas.js";

export async function getSharedImage(request: Request, response: Response) {
  const parsedParams = publicShareTokenParamsSchema.safeParse(request.params);
  if (!parsedParams.success) {
    throw new AppError("Shared image not found.", 404, "PUBLIC_SHARE_NOT_FOUND");
  }

  const { shareToken } = parsedParams.data;
  response.json({ image: await getPublicSharedImage(shareToken) });
}
