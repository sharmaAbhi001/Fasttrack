import mongoose, { Schema } from "mongoose";

const projectSupervisorSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
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
    startDate: {
      type: Date,
      required: true,
    },
    endDate:{
      type:Date
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
projectSupervisorSchema.index(
  { tenantId: 1, projectId: 1, userId: 1 },
  { unique: true }
);

projectSupervisorSchema.index({
  projectId: 1,
  status: 1,
});

projectSupervisorSchema.index({
  tenantId: 1,
  userId: 1,
});

export const ProjectSupervisor =
  mongoose.models.ProjectSupervisor ||
  mongoose.model("ProjectSupervisor", projectSupervisorSchema);
