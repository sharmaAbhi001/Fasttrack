import mongoose , { Schema } from "mongoose";
 
const projectSchema = new Schema({
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: "Tenant",
    required: true,
  },
  name: { type: String, required: true },
  location: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
},{ timestamps: true });

export const Project =
  mongoose.models.Project || mongoose.model("Project", projectSchema);