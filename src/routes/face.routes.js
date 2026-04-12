import express from "express";
import { permissionValidation } from "../middleware/permissionValidation.js";
import { validateData } from "../middleware/validationMiddleware.js";
import { faceRegisterSchema } from "../Schemas/faceSchema.js";
import {
  registerOrUpdateFace,
  getFaceByWorker,
  getFaceEmbeddingForMatch,
  deleteFace,
} from "../controllers/face.controller.js";

const router = express.Router();

router.post(
  "/worker/:workerId",
  permissionValidation(["FULL_ACCESS", "WORKER_CREATE", "ATTENDANCE_MARK"]),
  validateData(faceRegisterSchema),
  registerOrUpdateFace
);

router.get(
  "/worker/:workerId",
  permissionValidation(["FULL_ACCESS", "WORKER_VIEW"]),
  getFaceByWorker
);

router.get(
  "/worker/:workerId/embedding",
  permissionValidation(["FULL_ACCESS", "ATTENDANCE_MARK"]),
  getFaceEmbeddingForMatch
);

router.delete(
  "/worker/:workerId",
  permissionValidation(["FULL_ACCESS", "WORKER_CREATE"]),
  deleteFace
);

export default router;
