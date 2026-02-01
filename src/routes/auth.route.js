import express from "express"
import { createSystemAdmin, login } from "../controllers/auth.controller.js";



const router = express.Router();

router.post("/login", login);
router.post ("/", createSystemAdmin);



export default router;