import assert from "node:assert/strict";
import test from "node:test";
import type { Router } from "express";

import adminRoutes from "./admin.routes.js";
import authRoutes from "./auth.routes.js";
import productOwnerRoutes from "./productOwner.routes.js";
import publicRoutes from "./public.routes.js";
import userRoutes from "./user.routes.js";

type RouterLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: unknown[];
  };
};

function routeLayer(router: Router, path: string, method: string) {
  const layers = (router as unknown as { stack: RouterLayer[] }).stack;
  return layers.find((layer) => layer.route?.path === path && layer.route.methods[method]);
}

test("every authenticated role has a protected self-password endpoint", () => {
  const route = routeLayer(authRoutes, "/password", "patch");
  assert.ok(route?.route);
  assert.equal(route.route.stack.length, 3, "self-password requires auth, validation, and handler middleware");
});

test("Admin slot allocation is an explicitly protected tenant route", () => {
  const route = routeLayer(adminRoutes, "/users/:userId/slots", "post");
  assert.ok(route?.route);
  assert.ok(route.route.stack.length >= 5, "slot allocation requires auth, Admin role, params, body, and handler middleware");
});

test("Product Owner Admin-password reset is part of the Product Owner router", () => {
  const layers = (productOwnerRoutes as unknown as { stack: RouterLayer[] }).stack;
  assert.ok(layers.slice(0, 2).every((layer) => !layer.route), "Product Owner router must retain global auth and role guards");
  const route = routeLayer(productOwnerRoutes, "/:organisationId/admin/password", "patch");
  assert.ok(route?.route);
  assert.equal(route.route.stack.length, 3, "Admin reset requires params, body, and handler after router guards");
});

test("image share management is protected while shared-image retrieval is public", () => {
  const createRoute = routeLayer(userRoutes, "/images/:imageId/share", "post");
  const revokeRoute = routeLayer(userRoutes, "/images/:imageId/share", "delete");
  assert.ok(createRoute?.route && createRoute.route.stack.length >= 4);
  assert.ok(revokeRoute?.route && revokeRoute.route.stack.length >= 4);

  const publicRoute = routeLayer(publicRoutes, "/images/:shareToken", "get");
  assert.ok(publicRoute?.route);
  assert.equal(publicRoute.route.stack.length, 1, "public retrieval has a handler without user auth");
});
