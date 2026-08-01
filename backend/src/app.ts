import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { postPaymentWebhook } from "./controllers/payment.controller.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import productOwnerRoutes from "./routes/productOwner.routes.js";
import userRoutes from "./routes/user.routes.js";
import { asyncHandler } from "./utils/asyncHandler.js";

const app = express();
const allowedOrigins = process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()).filter(Boolean);

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins?.length ? allowedOrigins : true,
    credentials: true,
  }),
);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Razorpay signs the unparsed request bytes, so this endpoint must run before express.json().
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), asyncHandler(postPaymentWebhook));

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/organisations", productOwnerRoutes);
app.use("/api", adminRoutes);
app.use("/api", userRoutes);
app.use("/api/payments", paymentRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
