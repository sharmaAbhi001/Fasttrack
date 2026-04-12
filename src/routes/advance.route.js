import express from "express";
import {
  createOrRequestAdvance,
  requestAdvance,
  getAdvanceStatus,
  approveAdvance,
  rejectAdvance,
  getPendingAdvances,
} from "../controllers/advance.controller.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
import { permissionValidation } from "../middleware/permissionValidation.js";
import { advanceCreateSchema, advanceRejectSchema } from "../Schemas/advanceSchema.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ success: true, message: "Advance API" });
});

router.post(
  "/add",
  permissionValidation(["FULL_ACCESS", "ADVANCE_CREATE"]),
  validateRequest(advanceCreateSchema),
  createOrRequestAdvance
);

router.post(
  "/request",
  permissionValidation(["FULL_ACCESS", "ADVANCE_CREATE"]),
  validateRequest(advanceCreateSchema),
  requestAdvance
);

router.get(
  "/status",
  permissionValidation(["FULL_ACCESS", "ADVANCE_VIEW"]),
  getAdvanceStatus
);

router.get(
  "/pending",
  permissionValidation(["FULL_ACCESS", "ADVANCE_CREATE"]),
  getPendingAdvances
);

router.post(
  "/approve/:advanceId",
  permissionValidation(["FULL_ACCESS", "ADVANCE_CREATE"]),
  approveAdvance
);

router.post(
  "/reject/:advanceId",
  permissionValidation(["FULL_ACCESS", "ADVANCE_CREATE"]),
  validateRequest(advanceRejectSchema),
  rejectAdvance
);

export default router;
