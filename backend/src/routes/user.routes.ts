import { Router } from "express";

import {
  getImages,
  getNotifications,
  getUserQuota,
  postCompleteUpload,
  postUploadUrl,
} from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { validateBody, validateQuery } from "../middleware/validation.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { completeUploadSchema, imageQuerySchema, requestUploadSchema } from "../validators/schemas.js";

const router = Router();

router.use(requireAuth);
router.get("/images", authorize("ADMIN", "USER"), validateQuery(imageQuerySchema), asyncHandler(getImages));
router.get("/quota", authorize("USER"), asyncHandler(getUserQuota));
router.post("/images/upload-url", authorize("USER"), validateBody(requestUploadSchema), asyncHandler(postUploadUrl));
router.post("/images", authorize("USER"), validateBody(completeUploadSchema), asyncHandler(postCompleteUpload));
router.post("/images/complete", authorize("USER"), validateBody(completeUploadSchema), asyncHandler(postCompleteUpload));
router.get("/notifications", authorize("ADMIN", "USER"), asyncHandler(getNotifications));

export default router;
