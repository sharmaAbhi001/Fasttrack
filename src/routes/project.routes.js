import express from "express";
import { createProject } from "../controllers/project.controller.js";
import { permissionValidation } from "../middleware/permissionValidation.js";
import { validateData } from "../middleware/validationMiddleware.js";
import { projectCreateSchema } from "../Schemas/projectSchema.js";



const router = express.Router();


router.post("/",permissionValidation(["FULL_ACCESS"]) , validateData(projectCreateSchema) , createProject);
// router.get("/",getProject);
// router.patch("/", updateProject);
// router.delete("/", deleteProject);



export default router;