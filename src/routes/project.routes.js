import express from "express";
import {
  createProject,
  getAllProjects,
  getProject,
  getProjectSummary,
  updateProject,
  deleteProject,
} from "../controllers/project.controller.js";
import { permissionValidation } from "../middleware/permissionValidation.js";
import { validateData } from "../middleware/validationMiddleware.js";
import { projectCreateSchema, projectUpdateSchema } from "../Schemas/projectSchema.js";



const router = express.Router();


/** Only full access (owner) may create or mutate projects. HR/supervisors have PROJECT_VIEW on assigned projects only. */
router.post("/", permissionValidation(["FULL_ACCESS"]), validateData(projectCreateSchema), createProject);
router.get("/", permissionValidation(["FULL_ACCESS", "PROJECT_VIEW"]), getAllProjects);
router.get("/:projectId/summary", permissionValidation(["FULL_ACCESS", "PROJECT_VIEW"]), getProjectSummary);
router.get("/:projectId", permissionValidation(["FULL_ACCESS", "PROJECT_VIEW"]), getProject);
router.patch(
  "/:projectId",
  permissionValidation(["FULL_ACCESS"]),
  validateData(projectUpdateSchema),
  updateProject
);
router.delete("/:projectId", permissionValidation(["FULL_ACCESS"]), deleteProject);



export default router;