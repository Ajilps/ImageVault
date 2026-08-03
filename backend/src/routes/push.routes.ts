import { Router } from "express";

import { deletePushSubscription, postPushSubscription } from "../controllers/push.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { validateBody } from "../middleware/validation.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deletePushSubscriptionSchema, pushSubscriptionSchema } from "../validators/schemas.js";

const router = Router();

router.use(requireAuth, authorize("ADMIN", "USER"));
router.post("/subscriptions", validateBody(pushSubscriptionSchema), asyncHandler(postPushSubscription));
router.delete("/subscriptions", validateBody(deletePushSubscriptionSchema), asyncHandler(deletePushSubscription));

export default router;
