import type { Request, Response } from "express";

import { AppError } from "../errors/appError.js";
import { removePushSubscription, savePushSubscription } from "../services/push.service.js";

function authenticatedUser(request: Request) {
  if (!request.auth) {
    throw new AppError("Authentication is required.", 401, "AUTHENTICATION_REQUIRED");
  }
  return request.auth;
}

export async function postPushSubscription(request: Request, response: Response) {
  const result = await savePushSubscription(authenticatedUser(request), request.body);
  response.status(result.created ? 201 : 200).json({ subscription: result.subscription });
}

export async function deletePushSubscription(request: Request, response: Response) {
  await removePushSubscription(authenticatedUser(request), request.body.endpoint);
  response.status(204).send();
}
