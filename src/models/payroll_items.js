import { Schema } from "mongoose";

const payrollItemSchema = new Schema({
  payrollId: {
    type: Schema.Types.ObjectId,
    ref: "Payroll",
    required: true,
  },
  workerId: {
    type: Schema.Types.ObjectId,
    ref: "Worker",
    required: true,
  },
  grossSalary: {
    type: Number,
    required: true,
  },
  advance: {
    type: Number,
    default: 0,
  },
  netSalary: {
    type: Number,
    required: true,
  },
},{ timestamps: true });

export const PayrollItem =
  mongoose.models.PayrollItem ||
  mongoose.model("PayrollItem", payrollItemSchema);