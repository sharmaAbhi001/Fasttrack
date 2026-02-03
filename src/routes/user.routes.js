import express from "express";
import { validateData } from "../middleware/validationMiddleware.js";
import { permissionValidation } from "../middleware/permissionValidation.js";
import { userCreateSchema } from "../Schemas/userSchema.js";
import { createUser, getUsers, editUser } from "../controllers/user.controller.js";





const router = express.Router();

router.post("/", validateData(userCreateSchema),permissionValidation(["FULL_ACCESS"]), createUser);
router.get("/", permissionValidation(["FULL_ACCESS"]), getUsers);
router.patch("/:userId", permissionValidation(["FULL_ACCESS"]), editUser);

// router.delete("/", deleteUsers);


export default router;