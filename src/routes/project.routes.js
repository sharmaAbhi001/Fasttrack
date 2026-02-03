import express from "express";
import { createProject, getAllProjects, getProject } from "../controllers/project.controller.js";
import { permissionValidation } from "../middleware/permissionValidation.js";
import { validateData } from "../middleware/validationMiddleware.js";
import { projectCreateSchema } from "../Schemas/projectSchema.js";



const router = express.Router();


router.post("/",permissionValidation(["FULL_ACCESS"]) , validateData(projectCreateSchema) , createProject);
router.get("/",permissionValidation(["FULL_ACCESS", "PROJECT_VIEW"]), getAllProjects);
router.get("/:projectId", permissionValidation(["FULL_ACCESS"]), getProject);
// router.patch("/", updateProject);
// router.delete("/", deleteProject);



export default router;