import mongoose, { Schema } from "mongoose";

const workerSchema = new Schema({
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: "Tenant",
    required: true,
  },
  code:{
    type:String,
    required:true,
    unique:true
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

workerSchema.index({ tenantId: 1, code: 1 }, { unique: true });

export const Worker =
  mongoose.models.Worker || mongoose.model("Worker", workerSchema);