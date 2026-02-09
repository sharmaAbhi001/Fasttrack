import { Attendance } from "../models/attendance.js";
import { Project } from "../models/project.js";
import { ProjectMember } from "../models/projectMember.js";
import { Worker } from "../models/worker.js";
import asyncHandler from "../utils/handler.js";
import ApiError from "../utils/errApi.js";



export const markWorkerAttendance = async (req, res) => {
    try {
        const { workerId } = req.params;
        const { tenantId } = req.userData;
        const { projectId, date, checkIn, checkOut, status } = req.body;

        if (!tenantId) {
            return res.status(400).json({ success: false, message: "Tenant not found" });
        }

        if (!projectId) {
            return res.status(400).json({ success: false, message: "projectId is required" });
        }

        if (!mongoose.Types.ObjectId.isValid(workerId) || !mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({ success: false, message: "Invalid workerId or projectId" });
        }

        const worker = await Worker.findOne({ _id: workerId, tenantId });
        if (!worker) {
            return res.status(404).json({ success: false, message: "Worker not found" });
        }

        const project = await Project.findOne({ _id: projectId, tenantId });
        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        const attendanceDate = date ? new Date(date) : new Date();
        if (Number.isNaN(attendanceDate.getTime())) {
            return res.status(400).json({ success: false, message: "Invalid date" });
        }
        attendanceDate.setHours(0, 0, 0, 0);

        const activeAssignment = await ProjectMember.findOne({
            tenantId,
            workerId,
            projectId,
            $or: [
                { endDate: { $exists: false } },
                { endDate: null },
                { endDate: { $gte: attendanceDate } }
            ]
        });

        if (!activeAssignment) {
            return res.status(400).json({ success: false, message: "Worker is not assigned to this project" });
        }

        const update = {};

        if (typeof status !== "undefined") update.status = status;

        if (typeof checkIn !== "undefined") {
            const parsedCheckIn = new Date(checkIn);
            if (Number.isNaN(parsedCheckIn.getTime())) {
                return res.status(400).json({ success: false, message: "Invalid checkIn" });
            }
            update.checkIn = parsedCheckIn;
        }

        if (typeof checkOut !== "undefined") {
            const parsedCheckOut = new Date(checkOut);
            if (Number.isNaN(parsedCheckOut.getTime())) {
                return res.status(400).json({ success: false, message: "Invalid checkOut" });
            }
            update.checkOut = parsedCheckOut;
        }

        if (update.checkIn && update.checkOut && update.checkOut < update.checkIn) {
            return res.status(400).json({ success: false, message: "checkOut cannot be before checkIn" });
        }

        if (update.checkIn && update.checkOut) {
            update.workingHours = Math.max(0, (update.checkOut - update.checkIn) / (1000 * 60 * 60));
        }

        const filter = { tenantId, workerId, projectId, date: attendanceDate };

        let attendance = await Attendance.findOne(filter);
        if (attendance) {
            attendance = await Attendance.findOneAndUpdate(
                filter,
                { $set: update },
                { new: true, runValidators: true }
            );

            return res.status(200).json({
                success: true,
                message: "Attendance updated successfully",
                data: attendance
            });
        }

        const created = await Attendance.create({
            tenantId,
            workerId,
            projectId,
            date: attendanceDate,
            ...update
        });

        return res.status(201).json({
            success: true,
            message: "Attendance marked successfully",
            data: created
        });

    } catch (error) {
        console.log(error);
        if (error && error.code === 11000) {
            return res.status(400).json({ success: false, message: "Attendance already marked for this date" });
        }
        return res.status(500).json({ success: false, message: error.message });
    }
};

// here month is in query params 

export const  getAttendanceOfProject = asyncHandler(async ( req,res)=>{

    const {projectId} = req.params;
    const {monthYear} = req.query;
    const {tenantId} = req.userData;


    const project = await Project.findById(projectId);

    if(!project){
        return res.status(404).json(
            new ApiError(404,"Project not fount")
        )
    }

    // find all the worker of the project and tenant id with their attendance of this month 
    // create mongoose pipeline 

    



               
})

