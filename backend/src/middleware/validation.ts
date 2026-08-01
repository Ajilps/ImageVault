import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

import { AppError } from "../errors/appError.js";

function validate(
  schema: ZodType,
  read: (request: Request) => unknown,
  write: (request: Request, value: unknown) => void,
) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const result = schema.safeParse(read(request));

    if (!result.success) {
      next(
        new AppError(
          `Request validation failed: ${result.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join(", ")}`,
          400,
          "VALIDATION_ERROR",
        ),
      );
      return;
    }

    write(request, result.data);
    next();
  };
}

export function validateBody(schema: ZodType) {
  return validate(
    schema,
    (request) => request.body,
    (request, value) => {
      request.body = value;
    },
  );
}

export function validateParams(schema: ZodType) {
  return validate(
    schema,
    (request) => request.params,
    (request, value) => {
      request.params = value as Record<string, string>;
    },
  );
}

export function validateQuery(schema: ZodType) {
  return validate(
    schema,
    (request) => request.query,
    (request, value) => {
      request.query = value as Request["query"];
    },
  );
}
