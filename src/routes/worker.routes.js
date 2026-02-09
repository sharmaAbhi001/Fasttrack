import express from "express";
import { permissionValidation } from "../middleware/permissionValidation.js";
import { validateData } from "../middleware/validationMiddleware.js";
import { workerCreateSchema, workerUpdateSchema } from "../Schemas/workerSchema.js";
import { createWorker, getWorkers, getWorkerById, updateWorker, deleteWorker, assignWorkerToProject, assignMultipleWorkersToProject } from "../controllers/worker.controller.js";

const router = express.Router();


router.post("/", validateData(workerCreateSchema), permissionValidation(["FULL_ACCESS", "WORKER_CREATE"]), createWorker);
router.get("/", permissionValidation(["FULL_ACCESS", "WORKER_VIEW"]), getWorkers);
router.get("/:workerId", permissionValidation(["FULL_ACCESS", "WORKER_VIEW"]), getWorkerById);
router.patch("/:workerId", validateData(workerUpdateSchema), permissionValidation(["FULL_ACCESS", "WORKER_CREATE"]), updateWorker);
router.delete("/:workerId", permissionValidation(["FULL_ACCESS", "WORKER_CREATE"]), deleteWorker);
router.post("/:workerId/assign/:projectId", permissionValidation(["FULL_ACCESS", "WORKER_CREATE"]), assignWorkerToProject);
router.post("/assign-multiple/:projectId", permissionValidation(["FULL_ACCESS", "WORKER_CREATE"]), assignMultipleWorkersToProject);


export default router;
