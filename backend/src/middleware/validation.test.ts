import assert from "node:assert/strict";
import test from "node:test";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { AppError } from "../errors/appError.js";
import { validateQuery } from "./validation.js";

function getterOnlyQuery(value: unknown) {
  const request = {} as Request;
  Object.defineProperty(request, "query", {
    configurable: true,
    enumerable: true,
    get: () => value,
  });
  return request;
}

test("query validation supports the getter-only request.query used by Express 5", () => {
  const request = getterOnlyQuery({ page: "2" });
  let nextValue: unknown = "not-called";

  validateQuery(z.object({ page: z.coerce.number().int().positive() }))(
    request,
    {} as Response,
    ((error?: unknown) => { nextValue = error; }) as NextFunction,
  );

  assert.equal(nextValue, undefined);
  assert.deepEqual(request.validatedQuery, { page: 2 });
  assert.deepEqual(request.query, { page: "2" });
});

test("invalid getter-only query values return a validation error", () => {
  const request = getterOnlyQuery({ page: "invalid" });
  let nextValue: unknown;

  validateQuery(z.object({ page: z.coerce.number().int().positive() }))(
    request,
    {} as Response,
    ((error?: unknown) => { nextValue = error; }) as NextFunction,
  );

  assert.ok(nextValue instanceof AppError);
  assert.equal(nextValue.statusCode, 400);
  assert.equal(nextValue.code, "VALIDATION_ERROR");
});
