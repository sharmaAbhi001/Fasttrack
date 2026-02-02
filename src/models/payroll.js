import { Schema } from "mongoose";

const payrollSchema = new Schema({
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: "Tenant",
    required: true,
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  month: {
    type: Number, // 1–12
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["generated", "approved", "paid"],
    default: "generated",
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
},{ timestamps: true });

payrollSchema.index(
  { tenantId: 1, projectId: 1, month: 1, year: 1 },
  { unique: true }
);

export const Payroll =
  mongoose.models.Payroll || mongoose.model("Payroll", payrollSchema);