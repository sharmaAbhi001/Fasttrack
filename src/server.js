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

function corsAllowedOrigins() {
  const list = []
  const push = (s) => {
    const o = String(s).trim().replace(/\/$/, "")
    if (o && !list.includes(o)) list.push(o)
  }
  if (process.env.FRONTEND_URL) push(process.env.FRONTEND_URL)
  const extra = process.env.CORS_ORIGIN?.trim()
  if (extra) {
    for (const part of extra.split(",")) push(part)
  }
  return list
}

const allowedOrigins = corsAllowedOrigins()
if (allowedOrigins.length === 0) {
  console.warn("[CORS] Set FRONTEND_URL (and optional CORS_ORIGIN) or browser requests will be rejected.")
}

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, origin)
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
