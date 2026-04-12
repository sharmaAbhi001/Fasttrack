import mongoose from "mongoose";
import { Attendance } from "../models/attendance.js";
import { Project } from "../models/project.js";
import { ProjectMember } from "../models/projectMember.js";
import { Worker } from "../models/worker.js";
import asyncHandler from "../utils/handler.js";
import {
  faceAiBaseUrl,
  faceAiPaths,
  forwardWorkerPhotoToFaceAi,
} from "../services/faceAi.client.js";

/**
 * Upsert one attendance row for (tenant, worker, project, calendar day).
 * Merges patch with existing checkIn/checkOut for working-hours rules.
 */
async function persistAttendanceUpdate(tenantId, workerId, projectId, attendanceDate, patch) {
  const filter = { tenantId, workerId, projectId, date: attendanceDate };
  const existing = await Attendance.findOne(filter);

  const update = { ...patch };
  const effIn =
    patch.checkIn !== undefined
      ? patch.checkIn
      : existing?.checkIn
        ? new Date(existing.checkIn)
        : undefined;
  const effOut =
    patch.checkOut !== undefined
      ? patch.checkOut
      : existing?.checkOut
        ? new Date(existing.checkOut)
        : undefined;

  if (effIn && effOut && effOut < effIn) {
    return { error: { status: 400, message: "checkOut cannot be before checkIn" } };
  }
  if (effIn && effOut) {
    update.workingHours = Math.max(0, (effOut - effIn) / (1000 * 60 * 60));
  }

  if (existing) {
    const attendance = await Attendance.findOneAndUpdate(filter, { $set: update }, { new: true, runValidators: true });
    return { attendance, created: false, error: null };
  }

  try {
    const attendance = await Attendance.create({
      tenantId,
      workerId,
      projectId,
      date: attendanceDate,
      ...update,
    });
    return { attendance, created: true, error: null };
  } catch (error) {
    if (error && error.code === 11000) {
      return { error: { status: 400, message: "Attendance already marked for this date" } };
    }
    throw error;
  }
}

function isPythonFaceVerifySuccess(status, parsed) {
  if (status >= 400) return false;
  if (parsed == null || typeof parsed !== "object") return status >= 200 && status < 300;
  if (parsed.success === false || parsed.verified === false || parsed.match === false) return false;
  if (parsed.success === true || parsed.verified === true || parsed.match === true || parsed.ok === true)
    return true;
  return !("success" in parsed) && !("verified" in parsed) && !("match" in parsed);
}

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
        { endDate: { $gte: attendanceDate } },
      ],
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

    const result = await persistAttendanceUpdate(tenantId, workerId, projectId, attendanceDate, update);
    if (result.error) {
      return res.status(result.error.status).json({ success: false, message: result.error.message });
    }

    return res.status(result.created ? 201 : 200).json({
      success: true,
      message: result.created ? "Attendance marked successfully" : "Attendance updated successfully",
      data: result.attendance,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST multipart: photo (any image/* field), text fields projectId, workerCode, action (checkIn | checkOut), optional workerId.
 * Resolves worker by code, verifies optional workerId matches, checks project assignment,
 * forwards image + worker_id to Python /verify (FACE_AI_PATH_VERIFY), then records check-in or check-out at server time.
 */
export const markAttendanceWithFaceVerify = async (req, res) => {
  try {
    const { tenantId } = req.userData;
    const { projectId, workerCode, action, workerId: bodyWorkerId } = req.body || {};

    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Tenant not found" });
    }
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Valid projectId is required" });
    }
    if (!workerCode || typeof workerCode !== "string" || !workerCode.trim()) {
      return res.status(400).json({ success: false, message: "workerCode is required" });
    }

    const act = typeof action === "string" ? action.trim().toLowerCase() : "";
    if (act !== "checkin" && act !== "checkout") {
      return res.status(400).json({ success: false, message: "action must be checkIn or checkOut" });
    }

    const files = req.files || [];
    const image =
      files.find((f) => f.mimetype && f.mimetype.startsWith("image/")) ||
      files.find((f) => /^(photo|image|file|picture)$/i.test(f.fieldname)) ||
      files[0];
    if (!image || !image.buffer) {
      return res.status(400).json({ success: false, message: "Photo image file is required" });
    }

    const worker = await Worker.findOne({ tenantId, code: workerCode.trim() });
    if (!worker) {
      return res.status(404).json({ success: false, message: "Worker not found for this code" });
    }

    if (bodyWorkerId) {
      if (!mongoose.Types.ObjectId.isValid(bodyWorkerId)) {
        return res.status(400).json({ success: false, message: "Invalid workerId" });
      }
      if (String(worker._id) !== String(bodyWorkerId)) {
        return res.status(400).json({ success: false, message: "workerId does not match worker code" });
      }
    }

    const project = await Project.findOne({ _id: projectId, tenantId });
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const attendanceDate = new Date();
    attendanceDate.setHours(0, 0, 0, 0);

    const activeAssignment = await ProjectMember.findOne({
      tenantId,
      workerId: worker._id,
      projectId,
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gte: attendanceDate } },
      ],
    });

    if (!activeAssignment) {
      return res.status(400).json({ success: false, message: "Worker is not assigned to this project" });
    }

    if (!faceAiBaseUrl()) {
      return res.status(503).json({
        success: false,
        message: "Face AI service is not configured (FACE_SERVICE_URL or FACE_AI_SERVICE_URL)",
      });
    }

    const paths = faceAiPaths();
    const out = await forwardWorkerPhotoToFaceAi(paths.verify, String(worker._id), image, {
      tenantId,
      userId: req.userData?.userId,
      roleId: req.userData?.roleId,
    });

    let parsed = null;
    if ((out.contentType || "").includes("application/json") && out.body) {
      try {
        parsed = JSON.parse(out.body);
      } catch {
        parsed = null;
      }
    }

    if (!isPythonFaceVerifySuccess(out.status, parsed)) {
      const msg =
        (parsed && typeof parsed === "object" && typeof parsed.message === "string" && parsed.message) ||
        (parsed && typeof parsed === "object" && typeof parsed.detail === "string" && parsed.detail) ||
        "Face verification failed";
      return res.status(out.status >= 400 && out.status < 600 ? out.status : 400).json({
        success: false,
        message: msg,
        data: parsed ?? out.body,
      });
    }

    const now = new Date();
    const workerId = worker._id;

    if (act === "checkin") {
      const patch = { checkIn: now, status: "Present" };
      const result = await persistAttendanceUpdate(tenantId, workerId, projectId, attendanceDate, patch);
      if (result.error) {
        return res.status(result.error.status).json({ success: false, message: result.error.message });
      }
      return res.status(result.created ? 201 : 200).json({
        success: true,
        message: "Check-in recorded after face verification",
        data: { attendance: result.attendance, face: parsed },
      });
    }

    const filter = { tenantId, workerId, projectId, date: attendanceDate };
    const existing = await Attendance.findOne(filter);
    if (!existing || !existing.checkIn) {
      return res.status(400).json({
        success: false,
        message: "Check in first before check-out",
      });
    }
    if (existing.checkOut) {
      return res.status(400).json({
        success: false,
        message: "Check-out already recorded for today",
      });
    }

    const patch = { checkOut: now };
    const result = await persistAttendanceUpdate(tenantId, workerId, projectId, attendanceDate, patch);
    if (result.error) {
      return res.status(result.error.status).json({ success: false, message: result.error.message });
    }
    return res.status(200).json({
      success: true,
      message: "Check-out recorded after face verification",
      data: { attendance: result.attendance, face: parsed },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

function parseMonthYear(monthYear, month, year) {
  if (monthYear && typeof monthYear === "string") {
    const [y, m] = monthYear.split("-").map(Number);
    if (y && m >= 1 && m <= 12) return { y, m };
  }
  const y = Number(year);
  const m = Number(month);
  if (y && m >= 1 && m <= 12) return { y, m };
  return null;
}

/** GET /project/:projectId/month?monthYear=2025-04 or ?month=4&year=2025 */
export const getAttendanceForProjectMonth = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { tenantId } = req.userData;
  const parsed = parseMonthYear(req.query.monthYear, req.query.month, req.query.year);

  if (!parsed) {
    return res.status(400).json({
      success: false,
      message: "Provide monthYear (YYYY-MM) or month (1-12) and year",
    });
  }

  const { y, m } = parsed;
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59, 999);

  const project = await Project.findOne({ _id: projectId, tenantId });
  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  const workerIds = await ProjectMember.distinct("workerId", {
    tenantId,
    projectId,
    workerId: { $ne: null },
  });

  const records = await Attendance.find({
    tenantId,
    projectId,
    date: { $gte: start, $lte: end },
  })
    .populate("workerId", "name code phone status")
    .sort({ date: 1 });

  return res.status(200).json({
    success: true,
    message: "Attendance for project month",
    data: {
      projectId,
      month: m,
      year: y,
      workerIdsOnProject: workerIds,
      records,
      count: records.length,
    },
  });
});

/** GET /worker/:workerId/month?monthYear=2025-04 — optional projectId query */
export const getAttendanceForWorkerMonth = asyncHandler(async (req, res) => {
  const { workerId } = req.params;
  const { tenantId } = req.userData;
  const { projectId } = req.query;
  const parsed = parseMonthYear(req.query.monthYear, req.query.month, req.query.year);

  if (!parsed) {
    return res.status(400).json({
      success: false,
      message: "Provide monthYear (YYYY-MM) or month (1-12) and year",
    });
  }

  const worker = await Worker.findOne({ _id: workerId, tenantId });
  if (!worker) {
    return res.status(404).json({ success: false, message: "Worker not found" });
  }

  const { y, m } = parsed;
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59, 999);

  const filter = {
    tenantId,
    workerId,
    date: { $gte: start, $lte: end },
  };
  if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
    filter.projectId = projectId;
  }

  const records = await Attendance.find(filter)
    .populate("projectId", "name location status")
    .sort({ date: 1 });

  return res.status(200).json({
    success: true,
    message: "Attendance for worker month",
    data: {
      workerId,
      month: m,
      year: y,
      records,
      count: records.length,
    },
  });
});
