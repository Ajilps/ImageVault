import assert from "node:assert/strict";
import test from "node:test";

import { visibleImageFilterFor } from "./imageVisibility.js";

test("gallery visibility exposes public images and only the viewer's own private images", () => {
  assert.deepEqual(visibleImageFilterFor("viewer-id"), {
    OR: [
      { visibility: "PUBLIC" },
      { uploadedById: "viewer-id" },
    ],
  });
});
