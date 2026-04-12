import { Worker } from "../models/worker.js";
import mongoose from "mongoose";
import { Project } from "../models/project.js";
import { ProjectMember } from "../models/projectMember.js";
import { Attendance } from "../models/attendance.js";
import { WorkerDocument } from "../models/worker_documents.js";
import { Wages } from "../models/wages.js";
import { Advance } from "../models/advance.js";
import { PayrollItem } from "../models/payroll_items.js";

function normalizeWorkerPhone(phone) {
    if (typeof phone !== "string") return phone;
    return phone.replace(/\s/g, "");
}

export const createWorker = async (req, res) => {

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { tenantId } = req.userData;
        const { code, name, phone: rawPhone, address, joinDate, status ,documentType,documentNumber } = req.body;
        const phone = normalizeWorkerPhone(rawPhone);

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
            registrationComplete: false,
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

        const tid = new mongoose.Types.ObjectId(tenantId);
        const workers = await Worker.aggregate([
            { $match: { tenantId: tid } },
            {
                $lookup: {
                    from: "facedatas",
                    localField: "_id",
                    foreignField: "workerId",
                    as: "_faceMatch",
                },
            },
            {
                $set: {
                    registrationComplete: {
                        $or: [
                            { $eq: ["$registrationComplete", true] },
                            { $gt: [{ $size: "$_faceMatch" }, 0] },
                        ],
                    },
                },
            },
            {
                $lookup: {
                    from: "projectmembers",
                    let: { wid: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$workerId", "$$wid"] },
                                        { $eq: ["$tenantId", tid] },
                                    ],
                                },
                                endDate: null,
                            },
                        },
                        { $sort: { startDate: -1 } },
                        { $limit: 1 },
                        {
                            $lookup: {
                                from: "projects",
                                localField: "projectId",
                                foreignField: "_id",
                                as: "_p",
                            },
                        },
                        { $unwind: { path: "$_p", preserveNullAndEmptyArrays: true } },
                        {
                            $project: {
                                _id: "$projectId",
                                name: { $ifNull: ["$_p.name", "Unknown project"] },
                            },
                        },
                    ],
                    as: "_currentProjectArr",
                },
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    phone: 1,
                    address: 1,
                    joinDate: 1,
                    status: 1,
                    registrationComplete: 1,
                    currentProject: {
                        $ifNull: [{ $arrayElemAt: ["$_currentProjectArr", 0] }, null],
                    },
                },
            },
        ]);

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

/** Full worker profile + wages, attendance, payroll lines, advances, project membership history. */
export const getWorkerSummary = async (req, res) => {
    try {
        const { workerId } = req.params;
        const { tenantId } = req.userData;

        if (!tenantId) {
            return res.status(400).json({ success: false, message: "Tenant not found" });
        }

        if (!mongoose.Types.ObjectId.isValid(workerId)) {
            return res.status(400).json({ success: false, message: "Invalid workerId" });
        }

        const worker = await Worker.findOne({ _id: workerId, tenantId }).lean();
        if (!worker) {
            return res.status(404).json({ success: false, message: "Worker not found" });
        }

        const [wagesHistory, attendanceRecords, payrollItems, advances, projectHistory, openMember] =
            await Promise.all([
                Wages.find({ workerId, tenantId }).sort({ effectiveFromDate: -1 }).limit(80).lean(),
                Attendance.find({ workerId, tenantId })
                    .populate("projectId", "name location")
                    .sort({ date: -1 })
                    .limit(150)
                    .lean(),
                PayrollItem.find({ workerId, tenantId })
                    .populate({
                        path: "payrollId",
                        select: "month year status projectId generatedAt",
                        populate: { path: "projectId", select: "name" },
                    })
                    .sort({ createdAt: -1 })
                    .limit(80)
                    .lean(),
                Advance.find({ workerId, tenantId })
                    .populate("projectId", "name location")
                    .sort({ createdAt: -1 })
                    .limit(80)
                    .lean(),
                ProjectMember.find({ workerId, tenantId })
                    .populate("projectId", "name status")
                    .sort({ startDate: -1 })
                    .limit(40)
                    .lean(),
                ProjectMember.findOne({ workerId, tenantId, endDate: null })
                    .populate("projectId", "name status")
                    .lean(),
            ]);

        const currentProject =
            openMember?.projectId && typeof openMember.projectId === "object"
                ? {
                      _id: openMember.projectId._id,
                      name: openMember.projectId.name,
                      status: openMember.projectId.status,
                  }
                : null;

        return res.status(200).json({
            success: true,
            message: "Worker summary",
            data: {
                worker,
                currentProject,
                wagesHistory,
                attendanceRecords,
                payrollItems,
                advances,
                projectHistory,
            },
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
        const { name, phone: rawPhone, address, status } = req.body;
        const phone = rawPhone !== undefined ? normalizeWorkerPhone(rawPhone) : undefined;

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
                ...(phone ? { phone } : {}),
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

/** End open project membership (endDate) and close open wage row, same as switching projects in assign. */
export const dismissWorkerFromCurrentProject = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { workerId } = req.params;
        const { tenantId } = req.userData;

        if (!tenantId) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "Tenant not found" });
        }

        const worker = await Worker.findOne({ _id: workerId, tenantId }).session(session);
        if (!worker) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "Worker not found" });
        }

        const membership = await ProjectMember.findOne({
            workerId: worker._id,
            tenantId,
            endDate: null,
        }).session(session);

        if (!membership) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Worker has no active project assignment to dismiss",
            });
        }

        await ProjectMember.findByIdAndUpdate(
            membership._id,
            { endDate: new Date() },
            { session }
        );

        await Wages.findOneAndUpdate(
            { workerId: worker._id, tenantId, effectiveToDate: { $exists: false } },
            { effectiveToDate: new Date() },
            { session }
        );

        await session.commitTransaction();
        return res.status(200).json({
            success: true,
            message: "Removed from current project",
            data: { workerId: worker._id, projectId: membership.projectId },
        });
    } catch (error) {
        await session.abortTransaction();
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

function sameMongoId(a, b) {
    if (a == null || b == null) return false;
    return String(a) === String(b);
}

export const assignWorkerToProject = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { workerId, projectId } = req.params;
        const { tenantId } = req.userData;
        const { startDate, workerWages, overTimeRate } = req.body;
        const ot =
            overTimeRate != null && overTimeRate !== "" && !Number.isNaN(Number(overTimeRate))
                ? Number(overTimeRate)
                : 0;

        if (!tenantId) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "Tenant not found" });
        }

        const worker = await Worker.findOne({ _id: workerId, tenantId }).session(session);
        if (!worker) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "Worker not found" });
        }

        const project = await Project.findOne({ _id: projectId, tenantId }).session(session);
        if (!project) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        /** Only one open membership per worker (partial unique on endDate null). */
        const openMember = await ProjectMember.findOne({
            workerId: worker._id,
            tenantId,
            endDate: null,
        })
            .populate("projectId")
            .session(session);

        if (openMember) {
            const openProj = openMember.projectId;
            const openProjectId = openProj && typeof openProj === "object" && openProj._id ? openProj._id : openProj;

            if (sameMongoId(openProjectId, project._id)) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: "Worker is already assigned to this project",
                });
            }

            if (openProj && typeof openProj === "object" && openProj.status === "active") {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: `Worker is on active project "${openProj.name}". Dismiss them from the current project first (or mark that project inactive), then assign here.`,
                });
            }

            await ProjectMember.findByIdAndUpdate(
                openMember._id,
                { endDate: new Date() },
                { session }
            );
        }

        /**
         * Unique index on (workerId, projectId) prevents a second insert for the same pair.
         * Re-assigning after dismiss must reopen the existing ProjectMember row.
         */
        const priorSameProject = await ProjectMember.findOne({
            workerId: worker._id,
            tenantId,
            projectId: project._id,
        }).session(session);

        if (priorSameProject && priorSameProject.endDate) {
            await ProjectMember.findByIdAndUpdate(
                priorSameProject._id,
                {
                    $unset: { endDate: "" },
                    $set: { startDate: startDate ? new Date(startDate) : new Date() },
                },
                { session }
            );
        } else if (!priorSameProject) {
            await ProjectMember.create(
                [
                    {
                        tenantId,
                        workerId: worker._id,
                        projectId: project._id,
                        startDate: startDate ? new Date(startDate) : new Date(),
                    },
                ],
                { session }
            );
        } else {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Worker is already assigned to this project",
            });
        }

        await Wages.findOneAndUpdate(
            { workerId: worker._id, tenantId, effectiveToDate: { $exists: false } },
            { effectiveToDate: new Date() },
            { session }
        );

        await Wages.create(
            [
                {
                    tenantId,
                    workerId: worker._id,
                    dailyWage: workerWages,
                    overTimeRate: ot,
                    effectiveFromDate: new Date(),
                },
            ],
            { session }
        );

        await session.commitTransaction();

        return res.status(200).json({
            success: true,
            message: "Worker assigned to project",
            data: { workerId: worker._id, projectId: project._id },
        });
    } catch (error) {
        await session.abortTransaction();
        console.log(error);
        if (error && error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Could not save project assignment (duplicate). Refresh and try again.",
            });
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


export const getWorkersByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { tenantId } = req.userData;

        if (!tenantId) {
            return res.status(400).json({ success: false, message: "Tenant not found" });
        }

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({ success: false, message: "Invalid projectId" });
        }

        const project = await Project.findOne({ _id: projectId, tenantId });
        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        const workerIds = await ProjectMember.distinct("workerId", {
            tenantId,
            projectId,
            workerId: { $ne: null },
        });

        const tid = new mongoose.Types.ObjectId(tenantId);
        const workers = await Worker.aggregate([
            { $match: { _id: { $in: workerIds }, tenantId: tid } },
            {
                $lookup: {
                    from: "facedatas",
                    localField: "_id",
                    foreignField: "workerId",
                    as: "_faceMatch",
                },
            },
            {
                $set: {
                    registrationComplete: {
                        $or: [
                            { $eq: ["$registrationComplete", true] },
                            { $gt: [{ $size: "$_faceMatch" }, 0] },
                        ],
                    },
                },
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    code: 1,
                    phone: 1,
                    address: 1,
                    joinDate: 1,
                    status: 1,
                    registrationComplete: 1,
                },
            },
        ]);

        return res.status(200).json({
            success: true,
            message: "Workers on project",
            data: workers,
            count: workers.length,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/** GET ?code=…&projectId=optional — resolve worker for face attendance (validates project assignment when projectId set). */
export const lookupWorkerByCode = async (req, res) => {
  try {
    const { tenantId } = req.userData;
    const { code, projectId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Tenant not found" });
    }
    if (!code || typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ success: false, message: "Query parameter code is required" });
    }

    const worker = await Worker.findOne({ tenantId, code: code.trim() });
    if (!worker) {
      return res.status(404).json({ success: false, message: "Worker not found" });
    }

    if (projectId) {
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({ success: false, message: "Invalid projectId" });
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const assignment = await ProjectMember.findOne({
        tenantId,
        workerId: worker._id,
        projectId,
        $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: today } }],
      });
      if (!assignment) {
        return res.status(400).json({
          success: false,
          message: "Worker is not assigned to this project",
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Worker resolved",
      data: {
        _id: worker._id,
        name: worker.name,
        code: worker.code,
        registrationComplete: worker.registrationComplete,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const assignWageToWorker = async (req, res) => {
    try {
        const { workerId } = req.params;
        const { tenantId } = req.userData;
        const { dailyWage, overTimeRate, effectiveFromDate, effectiveToDate } = req.body;

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
            overTimeRate,
            effectiveFromDate: effectiveFromDate ? new Date(effectiveFromDate) : new Date(),
            effectiveToDate: effectiveToDate ? new Date(effectiveToDate) : undefined
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

