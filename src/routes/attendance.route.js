import express from "express";
import { markWorkerAttendance } from "../controllers/attendance.controller.js";





const router = express.Router();


router.get("/", (req, res) => {
    res.send("Attendance route is working");
});

router.post("/mark/:workerId",markWorkerAttendance);

//get attendance of a worker one month 

// get attendance of all worker 




export default router;