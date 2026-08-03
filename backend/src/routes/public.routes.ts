import { Router } from "express";

import { getSharedImage } from "../controllers/public.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/images/:shareToken", asyncHandler(getSharedImage));

export default router;
