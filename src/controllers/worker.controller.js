import { Worker } from "../models/worker.js";
import mongoose from "mongoose";
import { Project } from "../models/project.js";
import { ProjectMember } from "../models/projectMember.js";
import { Attendance } from "../models/attendance.js";
import { WorkerDocument } from "../models/worker_documents.js";
import { Wages } from "../models/wages.js";

export const createWorker = async (req, res) => {

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { tenantId } = req.userData;
        const { code, name, phone, address, joinDate, status ,documentType,documentNumber } = req.body;

        if (!tenantId) {
            return res.status(400).json({ success: false, message: "Tenant not found" });

            }

        const existingWorker = await Worker.findOne({ tenantId, code }).session(session);
        if (existingWorker) {
            session.abortTransaction();
            return res.status(400).json({ success: false, message: "Please enter unique worker code" });
        }

        const worker = await Worker.create([{
            tenantId,
            code,
            name,
            phone,
            address,
            joinDate,
            status: status || "active",
        }],{session});

        const workerDocument = await WorkerDocument.create([{
            tenantId,
            workerId: worker[0]._id,
            documentType,
            documentNumber:documentNumber,
            documentUrl: "https://example.com/aadhar-card.pdf",
            uploadedAt: new Date(),
        }],{session})

        await session.commitTransaction();

        return res.status(201).json({
            success: true,
            message: "Worker created successfully",
            data: worker,
        });

    } catch (error) {
        session.abortTransaction();
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "Worker with this code already exists" });
        }
        return res.status(400).json({ success: false, message: error.message });
    }finally {
        session.endSession();
    }
};

export const getWorkers = async (req, res) => {
    try {
        const { tenantId } = req.userData;

        if (!tenantId) {
            return res.status(400).json({ success: false, message: "Tenant not found" });
        }

        const workers = await Worker.find({ tenantId }).select("_id name phone address joinDate status");

        return res.status(200).json({
            success: true,
            message: "Workers retrieved successfully",
            data: workers,
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getWorkerById = async (req, res) => {
    try {
        const { workerId } = req.params;
        const { tenantId } = req.userData;

        if (!tenantId) {
            return res.status(400).json({ success: false, message: "Tenant not found" });
        }

        const worker = await Worker.findOne({ _id: workerId, tenantId });

        if (!worker) {
            return res.status(404).json({ success: false, message: "Worker not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Worker retrieved successfully",
            data: worker,
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const updateWorker = async (req, res) => {
    try {
        const { workerId } = req.params;
        const { tenantId } = req.userData;
        const { name, phone, address, status } = req.body;

        if (!tenantId) {
            return res.status(400).json({ success: false, message: "Tenant not found" });
        }

        const worker = await Worker.findOne({ _id: workerId, tenantId });
        if (!worker) {
            return res.status(404).json({ success: false, message: "Worker not found" });
        }

        const updatedWorker = await Worker.findByIdAndUpdate(
            workerId,
            {
                ...(name && { name }),
                ...(phone && { phone }),
                ...(address && { address }),
                ...(status && { status }),
            },
            { new: true, runValidators: true }
        );

        return res.status(200).json({
            success: true,
            message: "Worker updated successfully",
            data: updatedWorker,
        });

    } catch (error) {
        console.log(error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "Phone number already exists" });
        }
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteWorker = async (req, res) => {
    try {
        const { workerId } = req.params;
        const { tenantId } = req.userData;

        if (!tenantId) {
            return res.status(400).json({ success: false, message: "Tenant not found" });
        }

        const worker = await Worker.findOneAndDelete({ _id: workerId, tenantId });

        if (!worker) {
            return res.status(404).json({ success: false, message: "Worker not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Worker deleted successfully",
            data: { id: worker._id },
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const assignWorkerToProject = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { workerId, projectId } = req.params;
        const { tenantId } = req.userData;
        const { startDate,workerWages,  overTimeRate, endDate } = req.body;

        if (!tenantId) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "Tenant not found" });
        }

        // Validate worker
        const worker = await Worker.findOne({ _id: workerId, tenantId }).session(session);
        if (!worker) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "Worker not found" });
        }


        // Validate project
        const project = await Project.findOne({ _id: projectId, tenantId }).session(session);
        if (!project) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        // Check if worker is already assigned to an active project
        const existingAssignment = await ProjectMember.findOne(
            { workerId: worker._id, tenantId }
        ).populate("projectId").session(session);

        if (existingAssignment) {
            const currentProject = existingAssignment.projectId;
            
            // If current project is active, reject assignment
            if (currentProject.status === "active") {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: `Worker is currently assigned to active project: ${currentProject.name}. Cannot assign to another project while active.`
                });
            }

            // If current project is inactive/complete, end the current assignment
            await ProjectMember.findByIdAndUpdate(
                existingAssignment._id,
                { endDate: new Date() },
                { session }
            );
        }


        // discountinue previous wages if exist
         await Wages.findOneAndUpdate(
            { workerId: worker._id, tenantId, effectiveToDate: { $exists: false } },
            { effectiveToDate: new Date() },
            { session }
        );

        // Create new project membership
        const doc = {
            tenantId,
            workerId: worker._id,
            projectId: project._id,
            startDate: startDate ? new Date(startDate) : new Date(),
        };



        await ProjectMember.create([doc], { session });

        // find worker wages already exist cut it 
        await Wages.create([{
            tenantId,
            workerId: worker._id,
            dailyWage: workerWages,
            overTimeRate,
            effectiveFromDate: new Date(),
        }],{session})


        await session.commitTransaction();

        return res.status(200).json({
            success: true,
            message: "Worker assigned to project",
            data: { workerId: worker._id, projectId: project._id }
        });

    } catch (error) {
        await session.abortTransaction();
        console.log(error);
        if (error && error.code === 11000) {
            console.log(error)
            return res.status(400).json({ success: false, message: "Worker already assigned to this project" });
        }
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

export const assignMultipleWorkersToProject = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { projectId } = req.params;
        const { tenantId } = req.userData;
        const { workerIds, startDate, endDate } = req.body;

        if (!tenantId) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "Tenant not found" });
        }

        if (!Array.isArray(workerIds) || workerIds.length === 0) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "workerIds must be a non-empty array" });
        }

        // Validate project
        const project = await Project.findOne({ _id: projectId, tenantId }).session(session);
        if (!project) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        // Validate all workers exist
        const workers = await Worker.find({ _id: { $in: workerIds }, tenantId }).session(session);
        if (workers.length !== workerIds.length) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "One or more workers not found" });
        }

        // Check if any worker is already assigned to an active project
        const conflictingAssignments = await ProjectMember.find(
            { workerId: { $in: workerIds }, tenantId , endDate: null},
            null,
            { session }
        ).populate("projectId");

        const conflictingWorkers = [];
        const inactiveAssignmentIds = [];

        for (const assignment of conflictingAssignments) {
            const currentProject = assignment.projectId;
            
            if (currentProject.status === "active") {
                conflictingWorkers.push({
                    workerId: assignment.workerId,
                    projectName: currentProject.name
                });
            } else {
                // Mark inactive assignments for ending
                inactiveAssignmentIds.push(assignment._id);
            }
        }

        // If there are active project conflicts, reject
        if (conflictingWorkers.length > 0) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Some workers are assigned to active projects and cannot be reassigned",
                conflicts: conflictingWorkers
            });
        }

        // End inactive assignments
        if (inactiveAssignmentIds.length > 0) {
            await ProjectMember.updateMany(
                { _id: { $in: inactiveAssignmentIds } },
                { endDate: new Date() },
                { session }
            );
        }

        // Create project memberships
        const docs = workerIds.map(wId => ({
            tenantId,
            workerId: wId,
            projectId: project._id,
            startDate: startDate ? new Date(startDate) : new Date(),

        }));

        const created = await ProjectMember.create(docs, { session });

        await session.commitTransaction();

        return res.status(200).json({
            success: true,
            message: `${created.length} workers assigned to project`,
            data: { workerCount: created.length, projectId: project._id, previouslyReassigned: inactiveAssignmentIds.length }
        });

    } catch (error) {
        await session.abortTransaction();
        console.log(error);
        if (error && error.code === 11000) {
            return res.status(400).json({ success: false, message: "Some workers are already assigned to this project" });
        }
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};


export const assignWageToWorker = async (req, res) => {
    try {
        const { workerId } = req.params;
        const { tenantId } = req.userData;
        const { dailyWage, overtimeRate, effectiveFromDate, effectiveToDate } = req.body;

        if (!tenantId) {
            return res.status(400).json({ success: false, message: "Tenant not found" });
        }

        if (!mongoose.Types.ObjectId.isValid(workerId)) {
            return res.status(400).json({ success: false, message: "Invalid workerId" });
        }

        const worker = await Worker.findOne({ _id: workerId, tenantId });

        if (!worker) {
            return res.status(404).json({ success: false, message: "Worker not found" });
        }

       // Check if there's an active wage record and end it
        await Wages.findOneAndUpdate(
            { workerId: worker._id, tenantId, effectiveToDate: { $exists: false } },
            { effectiveToDate: new Date() }
        );

        const wages = await Wages.create({
            tenantId,
            workerId: worker._id,
            dailyWage,
            overtimeRate,
            effectiveFromDate,
            effectiveToDate
        });

        return res.status(201).json({
            success: true,
            message: "Wages assigned to worker successfully",
            data: wages
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

