import mongoose, { Schema } from "mongoose";

const wagesSchema = new Schema({
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: "Tenant",
    required: true,
  },
  workerId: {
    type: Schema.Types.ObjectId,
    ref: "Worker",
    required: true,
  },
  dailyWage: {
    type: Number,
    required: true,
  },
  overTimeRate: {
    type: Number,
    required: true,
  },
  effectiveFromDate: {
    type: Date,
    default: Date.now,
    required: true,
  },
  effectiveToDate: {
    type: Date,
  },
},{ timestamps: true });

export const Wages =
  mongoose.models.Wages || mongoose.model("Wages", wagesSchema);