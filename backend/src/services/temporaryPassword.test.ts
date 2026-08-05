import assert from "node:assert/strict";
import test from "node:test";

import { env } from "../config/env.js";
import { generateTemporaryPassword } from "./auth.service.js";

test("temporary account passwords are random, URL-safe, and within configured bounds", () => {
  const first = generateTemporaryPassword();
  const second = generateTemporaryPassword();

  assert.ok(first.length >= env.passwordMinLength);
  assert.ok(first.length <= env.passwordMaxLength);
  assert.match(first, /^[A-Za-z0-9_-]+$/);
  assert.notEqual(first, second);
  assert.notEqual(first, env.defaultAccountPassword);
});
