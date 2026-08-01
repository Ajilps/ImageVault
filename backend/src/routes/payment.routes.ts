import { Router } from "express";

import {
  getPaymentHistory,
  postPaymentOrder,
  postVerifyPayment,
} from "../controllers/payment.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { validateBody } from "../middleware/validation.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createPaymentOrderSchema, verifyPaymentSchema } from "../validators/schemas.js";

const router = Router();

router.use(requireAuth, authorize("USER"));
router.get("/", asyncHandler(getPaymentHistory));
router.post("/orders", validateBody(createPaymentOrderSchema), asyncHandler(postPaymentOrder));
router.post("/verify", validateBody(verifyPaymentSchema), asyncHandler(postVerifyPayment));

export default router;
