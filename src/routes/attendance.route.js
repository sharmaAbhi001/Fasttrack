import express from "express";
import multer from "multer";
import {
  markWorkerAttendance,
  markAttendanceWithFaceVerify,
  getAttendanceForProjectMonth,
  getAttendanceForWorkerMonth,
} from "../controllers/attendance.controller.js";
import { permissionValidation } from "../middleware/permissionValidation.js";

const router = express.Router();

const uploadAttendancePhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.ATTENDANCE_MAX_PHOTO_MB || 15) * 1024 * 1024 },
});

router.get("/", (req, res) => {
  res.json({ success: true, message: "Attendance API" });
});

router.get(
  "/project/:projectId/month",
  permissionValidation(["FULL_ACCESS", "ATTENDANCE_VIEW", "REPORT_VIEW"]),
  getAttendanceForProjectMonth
);

router.get(
  "/worker/:workerId/month",
  permissionValidation(["FULL_ACCESS", "ATTENDANCE_VIEW", "REPORT_VIEW"]),
  getAttendanceForWorkerMonth
);

router.post(
  "/mark/:workerId",
  permissionValidation(["FULL_ACCESS", "ATTENDANCE_MARK"]),
  markWorkerAttendance
);

router.post(
  "/mark-with-face",
  permissionValidation(["FULL_ACCESS", "ATTENDANCE_MARK"]),
  uploadAttendancePhoto.any(),
  markAttendanceWithFaceVerify
);

export default router;
