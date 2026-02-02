import mongoose, { Schema } from "mongoose";

const projectMemberSchema = new Schema({
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: "Tenant",
    required: true,
  },
  workerId: {
    type: Schema.Types.ObjectId,
    ref: "Worker",
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
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
  endDate: {
    type: Date,
  },
},{ timestamps: true });

projectMemberSchema.index(
  { workerId: 1, projectId: 1 },
  { unique: true, sparse: true }
);

projectMemberSchema.index(
  { userId: 1, projectId: 1 },
  { unique: true, sparse: true }
)

export const ProjectMember =
  mongoose.models.ProjectMember ||
  mongoose.model("ProjectMember", projectMemberSchema);