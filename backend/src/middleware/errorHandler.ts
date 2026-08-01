import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/appError.js";

export function notFoundHandler(request: Request, _response: Response, next: NextFunction) {
  next(new AppError(`Route ${request.method} ${request.originalUrl} was not found.`, 404, "NOT_FOUND"));
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  const prismaError = error as { code?: string; meta?: { target?: string[] } };

  if (prismaError.code === "P2002") {
    response.status(409).json({
      error: {
        code: "UNIQUE_CONSTRAINT",
        message: `A record with this ${prismaError.meta?.target?.join(", ") ?? "value"} already exists.`,
      },
    });
    return;
  }

  if (prismaError.code === "P2025") {
    response.status(404).json({
      error: {
        code: "RECORD_NOT_FOUND",
        message: "The requested record was not found.",
      },
    });
    return;
  }

  if (error instanceof SyntaxError && "body" in error) {
    response.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "The request body must contain valid JSON.",
      },
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred.",
    },
  });
}
