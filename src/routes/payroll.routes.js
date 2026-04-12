import express from "express";
import { permissionValidation } from "../middleware/permissionValidation.js";
import {
  generatePayroll,
  listPayrolls,
  getPayrollById,
  updatePayrollStatus,
} from "../controllers/payroll.controller.js";

const router = express.Router();

router.post("/generate", permissionValidation(["FULL_ACCESS", "PAYROLL_GENERATE"]), generatePayroll);

router.get("/", permissionValidation(["FULL_ACCESS", "PAYROLL_VIEW"]), listPayrolls);

router.get("/:payrollId", permissionValidation(["FULL_ACCESS", "PAYROLL_VIEW"]), getPayrollById);

router.patch("/:payrollId/status", permissionValidation(["FULL_ACCESS", "PAYROLL_GENERATE"]), updatePayrollStatus);

export default router;
