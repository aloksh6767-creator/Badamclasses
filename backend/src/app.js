import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import enrollmentRoutes from "./routes/enrollmentRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import instructorRoutes from "./routes/instructorRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import chatbotRoutes from "./routes/chatbotRoutes.js";
import currentAffairsRoutes from "./routes/currentAffairsRoutes.js";
import monitoringRoutes from "./routes/monitoringRoutes.js";
import offlineTestRoutes from "./routes/offlineTestRoutes.js";
import inquiryRoutes from "./routes/inquiryRoutes.js";
import automationRoutes from "./routes/automationRoutes.js";
import pdfRoutes from "./routes/pdfRoutes.js";
import liveStatusRoutes from "./routes/liveStatusRoutes.js";
import liveChatRoutes from "./routes/liveChatRoutes.js";
import securityHeaders from "./middleware/securityHeaders.js";
import { notifyErrorAlert } from "./utils/alertNotifier.js";
import { getDatabaseStatus, isMongoEnvConfigured } from "./config/db.js";
import { getPaymentDebugSummary } from "./controllers/paymentController.js";
import { startAutomationScheduler } from "./utils/automationScheduler.js";

const app = express();
startAutomationScheduler();
app.disable("x-powered-by");
app.set("trust proxy", 1);

const localAllowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3002"
];

const envOrigins = String(process.env.FRONTEND_URL || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(new Set([...localAllowedOrigins, ...envOrigins]));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const error = new Error("Origin not allowed by CORS");
      error.statusCode = 403;
      return callback(error);
    }
  })
);
app.use(securityHeaders);
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (req, res) => {
  const db = getDatabaseStatus();
  const payment = getPaymentDebugSummary();
  res.json({
    status: "ok",
    database: db.connected ? "connected" : "disconnected",
    dataLayer: db.connected ? "mongodb" : "local-fallback",
    databaseCode: db.code,
    message: db.detail,
    databaseMessage: db.message,
    env: isMongoEnvConfigured() ? "loaded" : "invalid",
    payment: {
      razorpayConfigured: payment.razorpay.configured
    }
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/instructor", instructorRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/current-affairs", currentAffairsRoutes);
app.use("/api/monitoring", monitoringRoutes);
app.use("/api/offline-tests", offlineTestRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/automation", automationRoutes);
app.use("/api/pdfs", pdfRoutes);
app.use("/api/live-status", liveStatusRoutes);
app.use("/api/live-chat", liveChatRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  const statusCode = err.statusCode || (String(err.code || "").startsWith("LIMIT_") ? 400 : 500);
  if (statusCode >= 500) {
    void notifyErrorAlert({
      severity: "critical",
      source: "backend",
      title: "API request failed",
      message: err.message || "Server error",
      statusCode,
      method: req.method,
      path: req.originalUrl,
      stack: err.stack
    }).catch((alertError) => {
      console.error("Backend alert failed:", alertError.message);
    });
  }

  const safeMessage = statusCode >= 500 && process.env.NODE_ENV === "production" ? "Server error" : err.message || "Server error";
  res.status(statusCode).json({ message: safeMessage });
});

export default app;
