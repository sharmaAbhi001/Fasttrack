import express from "express";

const router = express.Router();

router.post("/", createSuperAdmin);
router.post("/login", loginSuperAdmin);
router.patch("/", updateSuperAdmin);
router.delete("/", deleteSuperAdmin);


export default router;