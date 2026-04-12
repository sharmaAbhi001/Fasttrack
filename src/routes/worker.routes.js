import express from "express";
import { permissionValidation } from "../middleware/permissionValidation.js";
import { validateData } from "../middleware/validationMiddleware.js";
import { workerCreateSchema, workerUpdateSchema } from "../Schemas/workerSchema.js";
import {
    createWorker,
    getWorkers,
    getWorkerById,
    getWorkerSummary,
    lookupWorkerByCode,
    updateWorker,
    deleteWorker,
    dismissWorkerFromCurrentProject,
    assignWorkerToProject,
    assignMultipleWorkersToProject,
    getWorkersByProject,
    assignWageToWorker,
} from "../controllers/worker.controller.js";

const router = express.Router();

/** HR uses WORKER_CREATE; site supervisors use ATTENDANCE_MARK (same as marking attendance on site). */
const workerWrite = ["FULL_ACCESS", "WORKER_CREATE", "ATTENDANCE_MARK"];
const workerHrOnly = ["FULL_ACCESS", "WORKER_CREATE"];

router.post("/", validateData(workerCreateSchema), permissionValidation(workerWrite), createWorker);
router.get("/", permissionValidation(["FULL_ACCESS", "WORKER_VIEW"]), getWorkers);
router.get(
  "/project/:projectId",
  permissionValidation(["FULL_ACCESS", "WORKER_VIEW"]),
  getWorkersByProject
);
router.get(
  "/by-code",
  permissionValidation(["FULL_ACCESS", "ATTENDANCE_MARK", "WORKER_VIEW"]),
  lookupWorkerByCode
);
router.get("/:workerId/summary", permissionValidation(["FULL_ACCESS", "WORKER_VIEW"]), getWorkerSummary);
router.get("/:workerId", permissionValidation(["FULL_ACCESS", "WORKER_VIEW"]), getWorkerById);
router.patch("/:workerId", validateData(workerUpdateSchema), permissionValidation(workerWrite), updateWorker);
router.delete(
    "/:workerId/project",
    permissionValidation(workerWrite),
    dismissWorkerFromCurrentProject
);
router.delete("/:workerId", permissionValidation(workerHrOnly), deleteWorker);
router.post("/:workerId/assign/:projectId", permissionValidation(workerWrite), assignWorkerToProject);
router.post("/assign-multiple/:projectId", permissionValidation(workerHrOnly), assignMultipleWorkersToProject);

router.post(
  "/:workerId/wages",
  permissionValidation(workerWrite),
  assignWageToWorker
);

export default router;
