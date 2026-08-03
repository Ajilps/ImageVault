import assert from "node:assert/strict";
import test from "node:test";
import type { Router } from "express";

import adminRoutes from "./admin.routes.js";
import userRoutes from "./user.routes.js";

type RouterLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: unknown[];
  };
};

function routeLayers(router: Router) {
  return (router as unknown as { stack: RouterLayer[] }).stack;
}

test("shared /api routers do not install global authentication or role middleware", () => {
  for (const router of [adminRoutes, userRoutes]) {
    const layers = routeLayers(router);
    assert.ok(layers.length > 0);
    assert.ok(layers.every((layer) => layer.route), "Every middleware layer must belong to a concrete route.");
  }
});

test("all Admin and organisation routes include auth, role, and handler middleware", () => {
  for (const router of [adminRoutes, userRoutes]) {
    for (const layer of routeLayers(router)) {
      assert.ok(layer.route);
      assert.ok(layer.route.stack.length >= 3, `${layer.route.path} must include authentication, role validation, and a handler.`);
    }
  }
});
