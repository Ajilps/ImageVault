import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/appError.js";

type Role = "ADMIN" | "PRODUCT_OWNER" | "USER";

export function authorize(...roles: Role[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.auth) {
      next(new AppError("Authentication is required.", 401, "AUTHENTICATION_REQUIRED"));
      return;
    }

    if (!roles.includes(request.auth.role)) {
      next(new AppError("You do not have permission to perform this action.", 403, "FORBIDDEN"));
      return;
    }

    next();
  };
}
