import mongoose from "mongoose";
import { Payroll } from "../models/payroll.js";
import { PayrollItem } from "../models/payroll_items.js";
import { Project } from "../models/project.js";
import { Attendance } from "../models/attendance.js";
import { Advance } from "../models/advance.js";
import { ProjectMember } from "../models/projectMember.js";
import { Wages } from "../models/wages.js";

/** Reject bad route params (e.g. literal "null" from clients) before Mongoose CastError. */
function isValidPayrollIdParam(id) {
  if (id == null || typeof id !== "string") return false;
  const t = id.trim();
  if (!t || t === "null" || t === "undefined") return false;
  return mongoose.Types.ObjectId.isValid(t);
}

function monthRange(year, month) {
  const start = new Date(year, month - 1, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

async function wageOnDate(workerId, tenantId, day) {
  return Wages.findOne({
    workerId,
    tenantId,
    effectiveFromDate: { $lte: day },
    $or: [{ effectiveToDate: null }, { effectiveToDate: { $exists: false } }, { effectiveToDate: { $gte: day } }],
  }).sort({ effectiveFromDate: -1 });
}

function dayPayFromAttendance(att, dailyWage, overTimeRate) {
  const dw = Number(dailyWage) || 0;
  const otRate = Number(overTimeRate) || 0;
  const st = att.status;
  let base = 0;
  if (st === "Present") base = dw;
  else if (st === "HalfDay") base = dw * 0.5;
  else if (st === "Late") base = dw;
  const otHours = Number(att.overTime) || 0;
  const otPay = otHours > 0 ? otHours * otRate : 0;
  return base + otPay;
}

export const generatePayroll = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { tenantId } = req.userData;
    const { projectId, month, year } = req.body;

    if (!projectId || !month || !year) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "projectId, month (1-12), and year are required",
      });
    }

    const m = Number(month);
    const y = Number(year);
    if (m < 1 || m > 12) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "month must be 1-12" });
    }

    const project = await Project.findOne({ _id: projectId, tenantId }).session(session);
    if (!project) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const existing = await Payroll.findOne({ tenantId, projectId, month: m, year: y }).session(session);
    if (existing) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Payroll already exists for this project and period",
        data: { payrollId: existing._id },
      });
    }

    const { start, end } = monthRange(y, m);

    const members = await ProjectMember.find({
      tenantId,
      projectId,
      workerId: { $ne: null },
      startDate: { $lte: end },
      $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gte: start } }],
    })
      .session(session)
      .distinct("workerId");

    const [payroll] = await Payroll.create(
      [
        {
          tenantId,
          projectId,
          month: m,
          year: y,
          status: "generated",
        },
      ],
      { session }
    );

    const items = [];

    for (const wid of members) {
      const attendances = await Attendance.find({
        tenantId,
        projectId,
        workerId: wid,
        date: { $gte: start, $lte: end },
      }).session(session);

      let gross = 0;
      for (const att of attendances) {
        const wageRow = await wageOnDate(wid, tenantId, att.date);
        if (!wageRow) continue;
        gross += dayPayFromAttendance(att, wageRow.dailyWage, wageRow.overTimeRate);
      }

      const advAgg = await Advance.aggregate([
        {
          $match: {
            tenantId: new mongoose.Types.ObjectId(String(tenantId)),
            workerId: new mongoose.Types.ObjectId(String(wid)),
            projectId: new mongoose.Types.ObjectId(String(projectId)),
            status: "approved",
            date: { $gte: start, $lte: end },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]).session(session);

      const advanceTotal = advAgg[0]?.total || 0;
      const net = Math.max(0, gross - advanceTotal);

      items.push({
        payrollId: payroll._id,
        workerId: wid,
        grossSalary: Math.round(gross * 100) / 100,
        advance: Math.round(advanceTotal * 100) / 100,
        netSalary: Math.round(net * 100) / 100,
      });
    }

    if (items.length > 0) {
      await PayrollItem.insertMany(items, { session });
    }

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: "Payroll generated",
      data: { payroll, itemCount: items.length },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

export const listPayrolls = async (req, res) => {
  try {
    const { tenantId } = req.userData;
    const { projectId } = req.query;
    const filter = { tenantId };
    if (projectId) filter.projectId = projectId;

    const list = await Payroll.find(filter).sort({ year: -1, month: -1 }).populate("projectId", "name location");

    return res.status(200).json({ success: true, data: list, count: list.length });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getPayrollById = async (req, res) => {
  try {
    const { payrollId } = req.params;
    const { tenantId } = req.userData;

    if (!isValidPayrollIdParam(payrollId)) {
      return res.status(400).json({ success: false, message: "Invalid payroll id" });
    }

    const payroll = await Payroll.findOne({ _id: payrollId, tenantId }).populate("projectId", "name location");
    if (!payroll) {
      return res.status(404).json({ success: false, message: "Payroll not found" });
    }

    const items = await PayrollItem.find({ payrollId }).populate("workerId", "name code phone");

    return res.status(200).json({
      success: true,
      data: { payroll, items },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePayrollStatus = async (req, res) => {
  try {
    const { payrollId } = req.params;
    const { tenantId } = req.userData;
    const { status } = req.body;

    if (!isValidPayrollIdParam(payrollId)) {
      return res.status(400).json({ success: false, message: "Invalid payroll id" });
    }

    if (!["generated", "approved", "paid"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const payroll = await Payroll.findOneAndUpdate(
      { _id: payrollId, tenantId },
      { $set: { status } },
      { new: true }
    );

    if (!payroll) {
      return res.status(404).json({ success: false, message: "Payroll not found" });
    }

    return res.status(200).json({ success: true, data: payroll });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
