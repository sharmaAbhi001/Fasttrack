import mongoose from "mongoose";
import { Project } from "../models/project.js";
import { ProjectMember } from "../models/projectMember.js";
import { ProjectSupervisor } from "../models/ProjectSupervoiser.js";
import { Worker } from "../models/worker.js";
import { Attendance } from "../models/attendance.js";

/** Open assignment: no end date set (supervisor or staff-as-user on ProjectMember). */
const activeAssignmentEndClause = () => ({
  $or: [{ endDate: null }, { endDate: { $exists: false } }],
});

/** Project IDs this tenant user may access when they do not have full access (HR / supervisor). */
async function projectIdsAssignedToUser(tenantId, userId) {
  const tid = new mongoose.Types.ObjectId(String(tenantId));
  const uid = new mongoose.Types.ObjectId(String(userId));
  const end = activeAssignmentEndClause();

  const [fromSupervisor, fromMember] = await Promise.all([
    ProjectSupervisor.distinct("projectId", {
      tenantId: tid,
      userId: uid,
      status: "active",
      ...end,
    }),
    ProjectMember.distinct("projectId", {
      tenantId: tid,
      userId: uid,
      ...end,
    }),
  ]);

  return new Set([...fromSupervisor, ...fromMember].map((id) => String(id)));
}

async function tenantUserMayAccessProject(tenantId, userId, projectId, hasFullAccess) {
  if (hasFullAccess) return true;
  const ids = await projectIdsAssignedToUser(tenantId, userId);
  return ids.has(String(projectId));
}

export const createProject = async (req, res) => {
  // get project data

  const { projectName, location, startDate, endDate } = req.body;
  const { tenantId } = req.userData;

  try {
 
    if(!tenantId){
      return res.status(400).json({success: false, message: "Tenant not found"});
    }
    
    const project = await Project.create({
      tenantId,
      name: projectName,
      location,
      startDate,
      endDate,
      status: "active",
    });

    if (!project) {
      return res
        .status(400)
        .json({ success: false, message: "Project not created" });
    }

    return res
      .status(200)
      .json({
        success: true,
        message: "Project created successfully",
        project,
      });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};


export const getProject = async (req,res) =>{
  try {
    const { projectId } = req.params;
    const { tenantId } = req.userData;

    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Tenant not found" });
    }

    const project = await Project.findOne({ _id: projectId, tenantId });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const { userId, hasFullAccess } = req.userData;
    const allowed = await tenantUserMayAccessProject(tenantId, userId, projectId, Boolean(hasFullAccess));
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "Forbidden — you are not assigned to this project",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Project details retrieved successfully",
      data: project
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

/** Project + supervisor list, assigned workers, and attendance counts (current calendar month). */
export const getProjectSummary = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { tenantId } = req.userData;

    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Tenant not found" });
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid projectId" });
    }

    const tid = new mongoose.Types.ObjectId(tenantId);
    const pid = new mongoose.Types.ObjectId(projectId);

    const project = await Project.findOne({ _id: pid, tenantId: tid }).lean();
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const { userId, hasFullAccess } = req.userData;
    const allowed = await tenantUserMayAccessProject(tenantId, userId, projectId, Boolean(hasFullAccess));
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "Forbidden — you are not assigned to this project",
      });
    }

    const supervisors = await ProjectSupervisor.find({ tenantId: tid, projectId: pid })
      .populate("userId", "name phone status")
      .sort({ startDate: -1 })
      .lean();

    const activeSupervisorRows = supervisors.filter(
      (s) => s.status === "active" && (s.endDate == null || s.endDate === undefined)
    );

    const workerIds = await ProjectMember.distinct("workerId", {
      tenantId: tid,
      projectId: pid,
      workerId: { $ne: null },
      $or: [{ endDate: null }, { endDate: { $exists: false } }],
    });

    const workers = await Worker.find({ _id: { $in: workerIds }, tenantId: tid })
      .select("name code phone status joinDate registrationComplete")
      .sort({ name: 1 })
      .lean();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const attendanceAgg = await Attendance.aggregate([
      {
        $match: {
          tenantId: tid,
          projectId: pid,
          date: { $gte: monthStart, $lte: monthEnd },
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const attendanceThisMonth = { Present: 0, Absent: 0, HalfDay: 0, Late: 0 };
    let attendanceThisMonthTotal = 0;
    for (const row of attendanceAgg) {
      const key = row._id;
      if (key && Object.prototype.hasOwnProperty.call(attendanceThisMonth, key)) {
        attendanceThisMonth[key] = row.count;
      }
      attendanceThisMonthTotal += row.count;
    }

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const attendanceAggToday = await Attendance.aggregate([
      {
        $match: {
          tenantId: tid,
          projectId: pid,
          date: { $gte: todayStart, $lte: todayEnd },
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const attendanceToday = { Present: 0, Absent: 0, HalfDay: 0, Late: 0 };
    let attendanceTodayTotal = 0;
    for (const row of attendanceAggToday) {
      const key = row._id;
      if (key && Object.prototype.hasOwnProperty.call(attendanceToday, key)) {
        attendanceToday[key] = row.count;
      }
      attendanceTodayTotal += row.count;
    }

    return res.status(200).json({
      success: true,
      message: "Project summary",
      data: {
        project,
        stats: {
          supervisorCount: supervisors.length,
          activeSupervisorCount: activeSupervisorRows.length,
          workerCount: workers.length,
          attendanceThisMonth,
          attendanceThisMonthTotal,
          attendanceMonthLabel: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
          attendanceToday,
          attendanceTodayTotal,
          attendanceTodayLabel: todayStart.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
        },
        supervisors,
        workers,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

export const getAllProjects = async (req, res) => {
  try {
    const { tenantId, userId, hasFullAccess } = req.userData;

    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Tenant not found" });
    }

    const select = "_id name location startDate endDate status";

    let projects;
    if (hasFullAccess) {
      projects = await Project.find({ tenantId }).select(select).sort({ name: 1 });
    } else {
      const assignedIds = await projectIdsAssignedToUser(tenantId, userId);
      const idList = [...assignedIds].map((id) => new mongoose.Types.ObjectId(id));
      projects =
        idList.length === 0
          ? []
          : await Project.find({ tenantId, _id: { $in: idList } }).select(select).sort({ name: 1 });
    }

    return res.status(200).json({
      success: true,
      message: "Projects retrieved successfully",
      data: projects,
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { tenantId } = req.userData;
    const { projectName, location, startDate, endDate, status } = req.body;

    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Tenant not found" });
    }

    const project = await Project.findOne({ _id: projectId, tenantId });
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const updates = {};
    if (projectName !== undefined) updates.name = projectName;
    if (location !== undefined) updates.location = location;
    if (startDate !== undefined) updates.startDate = startDate;
    if (endDate !== undefined) updates.endDate = endDate;
    if (status !== undefined) updates.status = status;

    const updated = await Project.findByIdAndUpdate(projectId, { $set: updates }, { new: true, runValidators: true });

    return res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: updated,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { tenantId } = req.userData;

    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Tenant not found" });
    }

    const project = await Project.findOneAndDelete({ _id: projectId, tenantId });
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Project deleted successfully",
      data: { id: project._id },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
