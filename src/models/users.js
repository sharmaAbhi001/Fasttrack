import mongoose, { Schema } from "mongoose";



const userSchema = new Schema({
    authId: {
        type: Schema.Types.ObjectId,
        ref: "UserAuth",
        required: true,
    },
    tenantId: {
        type: Schema.Types.ObjectId,
        ref: "Tenant",
        required: true,
    },
    roleId:{
        type: Schema.Types.ObjectId,
        ref: "Role",
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
        unique: true,
    },
    address: {
        type: String,
    },

    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active",
    },
},{timestamps: true});

export const User = mongoose.models.User || mongoose.model("User", userSchema);