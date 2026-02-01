import mongoose, { Schema } from "mongoose";

const attendanceSchema = new Schema({
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
  projectId: {
    type: Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  checkIn: { type: Date },
  checkOut: { type: Date },
  workingHours: { type: Number },
  status: {
    type: String,
    enum: ["Present", "Absent", "HalfDay", "Late"],
    default: "Present",
  },
},{ timestamps: true });

export const Attendance =
  mongoose.models.Attendance ||
  mongoose.model("Attendance", attendanceSchema);