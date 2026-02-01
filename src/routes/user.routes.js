import express from "express";
import { validateData } from "../middleware/validationMiddleware.js";
import { permissionValidation } from "../middleware/permissionValidation.js";
import { userCreateSchema } from "../Schemas/userSchema.js";
import { createUser,  getUsers } from "../controllers/user.controller.js";





const router = express.Router();

router.post("/", validateData(userCreateSchema),permissionValidation(["FULL_ACCESS"]), createUser);
router.get("/", permissionValidation(["FULL_ACCESS"]), getUsers);
// router.delete("/", deleteUsers);


export default router;