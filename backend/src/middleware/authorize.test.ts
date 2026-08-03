import assert from "node:assert/strict";
import test from "node:test";
import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/appError.js";
import { authorize } from "./authorize.js";

type Role = "PRODUCT_OWNER" | "ADMIN" | "USER";

function check(allowed: Role[], actual?: Role) {
  let result: unknown = "not-called";
  const request = {
    auth: actual ? { id: "00000000-0000-0000-0000-000000000001", role: actual, organizationId: actual === "PRODUCT_OWNER" ? null : "00000000-0000-0000-0000-000000000002" } : undefined,
  } as Request;
  authorize(...allowed)(request, {} as Response, ((error?: unknown) => { result = error; }) as NextFunction);
  return result;
}

test("Product Owner access is restricted to Product Owner routes", () => {
  assert.equal(check(["PRODUCT_OWNER"], "PRODUCT_OWNER"), undefined);
  assert.ok(check(["ADMIN"], "PRODUCT_OWNER") instanceof AppError);
  assert.ok(check(["USER"], "PRODUCT_OWNER") instanceof AppError);
});

test("Admin can use Admin and shared organisation routes but not User-only routes", () => {
  assert.equal(check(["ADMIN"], "ADMIN"), undefined);
  assert.equal(check(["ADMIN", "USER"], "ADMIN"), undefined);
  assert.ok(check(["USER"], "ADMIN") instanceof AppError);
});

test("User can use User and shared organisation routes but not Admin routes", () => {
  assert.equal(check(["USER"], "USER"), undefined);
  assert.equal(check(["ADMIN", "USER"], "USER"), undefined);
  const forbidden = check(["ADMIN"], "USER") as AppError;
  assert.equal(forbidden.statusCode, 403);
  assert.equal(forbidden.code, "FORBIDDEN");
});

test("missing authentication always returns 401", () => {
  const error = check(["PRODUCT_OWNER", "ADMIN", "USER"]) as AppError;
  assert.equal(error.statusCode, 401);
  assert.equal(error.code, "AUTHENTICATION_REQUIRED");
});
