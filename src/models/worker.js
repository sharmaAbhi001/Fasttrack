import mongoose, { Schema } from "mongoose";

const workerSchema = new Schema({
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: "Tenant",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  address: String,
  joinDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
},{ timestamps: true });

export const Worker =
  mongoose.models.Worker || mongoose.model("Worker", workerSchema);