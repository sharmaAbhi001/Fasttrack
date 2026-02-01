import mongoose ,{Schema} from "mongoose";



const advanceSchema = new Schema({
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
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
    approvedBy: {
        type: Schema.Types.ObjectId,
        ref: "Users",
    },
},{timestamps: true});

export const Advance = mongoose.model.Advance || mongoose.model("Advance", advanceSchema);