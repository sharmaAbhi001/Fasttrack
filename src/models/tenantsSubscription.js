import { Schema } from "mongoose";


const tenantSubscriptionSchema = new Schema({
    tenantId: {
        type: Schema.Types.ObjectId,
        ref: "Tenant",
        required: true,
    },
    subscriptionId: {
        type: Schema.Types.ObjectId,
        ref: "Subscription",
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active",
    },
    workerLimit: {
        type: Number,
        default: 0,
    },
    projectLimit: {
        type: Number,
        default: 0,

    }
},{timestamps:true});



export const TenantSubscription = mongoose.models.TenantSubscription ||  mongoose.model("TenantSubscription", tenantSubscriptionSchema);