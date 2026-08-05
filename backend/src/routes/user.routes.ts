import { Router } from "express";

import {
  deleteNotification,
  deleteImageShare,
  getImages,
  getOrganisationMembers,
  getNotifications,
  getUserQuota,
  postCompleteUpload,
  postImageShare,
  postUploadUrl,
} from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validation.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { completeUploadSchema, imageIdParamsSchema, imageQuerySchema, notificationIdParamsSchema, requestUploadSchema } from "../validators/schemas.js";

const router = Router();

router.get("/images", requireAuth, authorize("ADMIN", "USER"), validateQuery(imageQuerySchema), asyncHandler(getImages));
router.get("/members", requireAuth, authorize("ADMIN", "USER"), asyncHandler(getOrganisationMembers));
router.get("/quota", requireAuth, authorize("USER"), asyncHandler(getUserQuota));
router.post("/images/upload-url", requireAuth, authorize("USER"), validateBody(requestUploadSchema), asyncHandler(postUploadUrl));
router.post("/images", requireAuth, authorize("USER"), validateBody(completeUploadSchema), asyncHandler(postCompleteUpload));
router.post("/images/complete", requireAuth, authorize("USER"), validateBody(completeUploadSchema), asyncHandler(postCompleteUpload));
router.post("/images/:imageId/share", requireAuth, authorize("USER"), validateParams(imageIdParamsSchema), asyncHandler(postImageShare));
router.delete("/images/:imageId/share", requireAuth, authorize("USER"), validateParams(imageIdParamsSchema), asyncHandler(deleteImageShare));
router.get("/notifications", requireAuth, authorize("ADMIN", "USER"), asyncHandler(getNotifications));
router.delete("/notifications/:notificationId", requireAuth, authorize("ADMIN", "USER"), validateParams(notificationIdParamsSchema), asyncHandler(deleteNotification));

export default router;
