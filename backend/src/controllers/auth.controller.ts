import type { Request, Response } from "express";

import { AppError } from "../errors/appError.js";
import { changeOwnPassword, getCurrentUser, login } from "../services/auth.service.js";

export async function loginUser(request: Request, response: Response) {
  const result = await login(request.body);
  response.json(result);
}

export async function getMe(request: Request, response: Response) {
  if (!request.auth) {
    throw new AppError("Authentication is required.", 401, "AUTHENTICATION_REQUIRED");
  }

  response.json({ user: await getCurrentUser(request.auth.id) });
}

export async function patchOwnPassword(request: Request, response: Response) {
  if (!request.auth) {
    throw new AppError("Authentication is required.", 401, "AUTHENTICATION_REQUIRED");
  }

  await changeOwnPassword(request.auth.id, request.body);
  response.status(204).send();
}
