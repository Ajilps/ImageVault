import type { Request, Response } from "express";

import { AppError } from "../errors/appError.js";
import {
  completeImageUpload,
  createPublicImageShare,
  getQuota,
  listOrganisationMembers,
  listNotifications,
  listOrganisationImages,
  requestImageUpload,
  revokePublicImageShare,
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
  const query = (request.validatedQuery ?? {}) as { taggedUserId?: string };
  response.json({
    images: await listOrganisationImages(authenticatedUser(request), query.taggedUserId),
  });
}

export async function getOrganisationMembers(request: Request, response: Response) {
  response.json({ users: await listOrganisationMembers(authenticatedUser(request)) });
}

export async function getNotifications(request: Request, response: Response) {
  response.json({ notifications: await listNotifications(authenticatedUser(request)) });
}

export async function postImageShare(request: Request, response: Response) {
  const { imageId } = request.params as { imageId: string };
  const share = await createPublicImageShare(authenticatedUser(request), imageId);
  response.status(201).json({ share });
}

export async function deleteImageShare(request: Request, response: Response) {
  const { imageId } = request.params as { imageId: string };
  await revokePublicImageShare(authenticatedUser(request), imageId);
  response.status(204).send();
}
