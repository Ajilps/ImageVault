import type { Request, Response } from "express";

import { AppError } from "../errors/appError.js";
import {
  completeImageUpload,
  getQuota,
  listNotifications,
  listOrganisationImages,
  requestImageUpload,
} from "../services/user.service.js";

function authenticatedUser(request: Request) {
  if (!request.auth) {
    throw new AppError("Authentication is required.", 401, "AUTHENTICATION_REQUIRED");
  }

  return request.auth;
}

export async function getUserQuota(request: Request, response: Response) {
  response.json({ quota: await getQuota(authenticatedUser(request)) });
}

export async function postUploadUrl(request: Request, response: Response) {
  const upload = await requestImageUpload(authenticatedUser(request), request.body);
  response.status(201).json({ upload });
}

export async function postCompleteUpload(request: Request, response: Response) {
  const image = await completeImageUpload(authenticatedUser(request), request.body);
  response.status(201).json({ image });
}

export async function getImages(request: Request, response: Response) {
  response.json({
    images: await listOrganisationImages(authenticatedUser(request), request.query.taggedUserId as string | undefined),
  });
}

export async function getNotifications(request: Request, response: Response) {
  response.json({ notifications: await listNotifications(authenticatedUser(request)) });
}
