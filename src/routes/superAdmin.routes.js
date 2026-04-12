import express from "express";
import { createSystemAdmin, login } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", createSystemAdmin);
router.post("/login", login);

export default router;
