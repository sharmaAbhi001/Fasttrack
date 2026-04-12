import express from "express"
import { createSystemAdmin, getTenantMe, login } from "../controllers/auth.controller.js";



const router = express.Router();

router.post("/login", login);
router.get("/me", getTenantMe);
router.post ("/", createSystemAdmin);



export default router;