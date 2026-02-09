import mongoose ,{Schema} from "mongoose";



const advanceSchema = new Schema({
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
    workerId: {
        type: Schema.Types.ObjectId,
        ref: "Worker",
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    reason: {
        type: String,
        required: true,
    },
    advanceType: {
        type: String,
        enum: ["direct", "request"],
        default: "request",
        description: "direct: auto-approved if amount < daily wage, request: needs approval if amount >= daily wage"
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
    requestedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    approvedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    approvedAt: {
        type: Date,
    },
    rejectedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    rejectedAt: {
        type: Date,
    },
    rejectionReason: {
        type: String,
    },
},{timestamps: true});

advanceSchema.index({ tenantId: 1, projectId: 1, workerId: 1, date: 1 });
advanceSchema.index({ tenantId: 1, projectId: 1, status: 1 });

export const Advance = mongoose.model.Advance || mongoose.model("Advance", advanceSchema);