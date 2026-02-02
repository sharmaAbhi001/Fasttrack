import { Schema } from "mongoose";

const attendanceCorrectionSchema = new Schema({
  attendanceId: {
    type: Schema.Types.ObjectId,
    ref: "Attendance",
    required: true,
  },
  reason: { type: String, required: true },
  requestedChanges: {
    checkIn: Date,
    checkOut: Date,
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
},{ timestamps: true });

attendanceCorrectionSchema.index(
  { attendanceId: 1 },
  { unique: true }
);

export const AttendanceCorrection =
  mongoose.models.AttendanceCorrection ||
  mongoose.model("AttendanceCorrection", attendanceCorrectionSchema);