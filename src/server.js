import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import { connectDB } from "./libs/db.config.js";
import authRouter from "./routes/auth.route.js";
import tenantRouter from "./routes/tenant.routes.js";
import projectRouter from "./routes/project.routes.js";
import userRouter from "./routes/user.routes.js";
import workerRouter from "./routes/worker.routes.js";
import attendanceRouter from "./routes/attendance.route.js";
import advanceRouter from "./routes/advance.route.js";
import payrollRouter from "./routes/payroll.routes.js";
import faceRouter from "./routes/face.routes.js";
import faceAiRouter from "./routes/faceAi.routes.js";
import superAdminRouter from "./routes/superAdmin.routes.js";

dotenv.config();

const app = express();

/**
 * CORS (no proxy needed). Browsers send your SPA’s origin (e.g. http://localhost:5173); this list must include it.
 * - FRONTEND_URL: one origin (your Vite / deployed SPA URL).
 * - CORS_ORIGIN: comma-separated extra origins (optional).
 * - Cannot use * with credentials:true.
 * If neither is set, common local Vite ports are allowed.
 */
const DEFAULT_DEV_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]

function buildAllowedOrigins() {
  const raw = process.env.CORS_ORIGIN?.trim()
  if (raw === "*") {
    console.warn(
      "[CORS] CORS_ORIGIN=* is incompatible with credentials:true; using defaults only."
    )
    return DEFAULT_DEV_ORIGINS
  }

  const merged = new Set(DEFAULT_DEV_ORIGINS)
  const front = process.env.FRONTEND_URL?.trim()
  if (front) merged.add(front)
  if (raw) {
    for (const part of raw.split(",")) {
      const o = part.trim()
      if (o) merged.add(o)
    }
  }

  // Only defaults when nothing custom was provided
  if (!front && !raw) return DEFAULT_DEV_ORIGINS
  return [...merged]
}

const allowedOrigins = buildAllowedOrigins()

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, origin)
    console.warn(`[CORS] Blocked origin: ${origin}. Add it to CORS_ORIGIN (comma-separated).`)
    return callback(null, false)
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}
app.use(cors(corsOptions));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "5mb" }));
app.use(express.urlencoded({ extended: true, limit: process.env.URLENCODED_LIMIT || "2mb" }));
app.use(cookieParser());

const PORT = Number(process.env.PORT) || 8080;

app.use("/api/auth", authRouter);
app.use("/api/super-admin", superAdminRouter);
app.use("/api/tenant", tenantRouter);
app.use("/api/project", projectRouter);
app.use("/api/user", userRouter);
app.use("/api/worker", workerRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/advance", advanceRouter);
app.use("/api/payroll", payrollRouter);
app.use("/api/face", faceRouter);
app.use("/api/face-ai", faceAiRouter);

app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Server error",
  });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => console.log(err));
