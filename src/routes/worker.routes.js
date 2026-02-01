import express from "express";




const router = express.Router();


router.post("/", createWorker);
router.get("/", getWorker);
router.patch("/", updateWorker);
router.delete("/", deleteWorker);


export default router;