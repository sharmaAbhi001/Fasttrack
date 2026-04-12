import express from "express";
import multer from "multer";
import { permissionValidation } from "../middleware/permissionValidation.js";
import {
  proxyFaceServiceHealth,
  proxyLiveness,
  proxyEmbed,
  proxyMatchMultipart,
  proxyMatchJson,
  proxyVerify,
  proxyRegisterPython,
  registerWorkerFaceViaAiService,
} from "../controllers/faceAiProxy.controller.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.FACE_AI_MAX_UPLOAD_MB || 25) * 1024 * 1024 },
});

/** Any authenticated tenant user can hit pure proxies (tighten per route if needed). */
const faceAiPerms = ["FULL_ACCESS", "ATTENDANCE_MARK", "WORKER_CREATE"];

router.get("/health", permissionValidation(faceAiPerms), proxyFaceServiceHealth);

router.post("/liveness", permissionValidation(faceAiPerms), upload.any(), proxyLiveness);

router.post("/embed", permissionValidation(faceAiPerms), upload.any(), proxyEmbed);

router.post("/match", permissionValidation(faceAiPerms), upload.any(), proxyMatchMultipart);

router.post("/match/json", permissionValidation(faceAiPerms), proxyMatchJson);

router.post("/verify", permissionValidation(faceAiPerms), upload.any(), proxyVerify);

router.post(
  "/register-python",
  permissionValidation(faceAiPerms),
  upload.any(),
  proxyRegisterPython
);

/** Node orchestration: Python register → save Mongo FaceData (supervisors: ATTENDANCE_MARK). */
router.post(
  "/worker/:workerId/register",
  permissionValidation(["FULL_ACCESS", "WORKER_CREATE", "ATTENDANCE_MARK"]),
  upload.any(),
  registerWorkerFaceViaAiService
);

export default router;
