import type { Request, Response } from "express";

import { AppError } from "../errors/appError.js";
import { allocateUserSlots, createUser, deleteUser, listUsers, updateUser } from "../services/admin.service.js";
import { listOrganisationImages } from "../services/user.service.js";

function authenticatedUser(request: Request) {
  if (!request.auth) {
    throw new AppError("Authentication is required.", 401, "AUTHENTICATION_REQUIRED");
  }

  return request.auth;
}

export async function getUsers(request: Request, response: Response) {
  response.json({ users: await listUsers(authenticatedUser(request)) });
}

export async function postUser(request: Request, response: Response) {
  const user = await createUser(authenticatedUser(request), request.body);
  response.status(201).json({ user });
}

export async function patchUser(request: Request, response: Response) {
  const { userId } = request.params as { userId: string };
  const user = await updateUser(authenticatedUser(request), userId, request.body);
  response.json({ user });
}

export async function removeUser(request: Request, response: Response) {
  const { userId } = request.params as { userId: string };
  await deleteUser(authenticatedUser(request), userId);
  response.status(204).send();
}

export async function postUserSlots(request: Request, response: Response) {
  const { userId } = request.params as { userId: string };
  const user = await allocateUserSlots(authenticatedUser(request), userId, request.body.additionalSlots);
  response.json({ user });
}

export async function getOrganisationImages(request: Request, response: Response) {
  const query = (request.validatedQuery ?? {}) as { taggedUserId?: string };
  response.json({
    images: await listOrganisationImages(authenticatedUser(request), query.taggedUserId),
  });
}
