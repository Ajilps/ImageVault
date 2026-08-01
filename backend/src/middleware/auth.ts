import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/appError.js";
import { prisma } from "../lib/prisma.js";
import { verifyAccessToken } from "../services/auth.service.js";

export async function requireAuth(request: Request, _response: Response, next: NextFunction) {
  try {
    const authorization = request.header("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      throw new AppError("A Bearer access token is required.", 401, "AUTHENTICATION_REQUIRED");
    }

    const { id } = verifyAccessToken(authorization.slice(7));
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        organizationId: true,
      },
    });

    if (!user) {
      throw new AppError("The account associated with this token no longer exists.", 401, "INVALID_TOKEN");
    }

    request.auth = user;
    next();
  } catch (error) {
    next(error);
  }
}
