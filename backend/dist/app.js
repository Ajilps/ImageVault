import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { postPaymentWebhook } from "./controllers/payment.controller.js";
import { getPublicConfig } from "./controllers/config.controller.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { rateLimit } from "./middleware/rateLimit.js";
import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import pushRoutes from "./routes/push.routes.js";
import productOwnerRoutes from "./routes/productOwner.routes.js";
import publicRoutes from "./routes/public.routes.js";
import userRoutes from "./routes/user.routes.js";
import { env } from "./config/env.js";
import { asyncHandler } from "./utils/asyncHandler.js";
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({
    origin: env.corsOrigins,
    credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
// Razorpay signs the unparsed request bytes, so this endpoint must run before express.json().
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), asyncHandler(postPaymentWebhook));
app.use(express.json({ limit: env.jsonBodyLimitBytes }));
app.use("/api", rateLimit({ windowMs: env.apiRateLimitWindowMs, max: env.apiRateLimitMax }));
app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
});
app.get("/api/config/public", getPublicConfig);
app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/organisations", productOwnerRoutes);
app.use("/api", adminRoutes);
app.use("/api", userRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/push", pushRoutes);
app.use(notFoundHandler);
app.use(errorHandler);
export default app;
