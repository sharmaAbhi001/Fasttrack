import mongoose, { Schema } from "mongoose";



const userSchema = new Schema({
    authId: {
        type: Schema.Types.ObjectId,
        ref: "UserAuth",
        required: true,
        unique:true,
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

userSchema.index({ authId: 1, tenantId: 1 }, { unique: true });
userSchema.index({ tenantId: 1, phone: 1 }, { unique: true });

export const User = mongoose.models.User || mongoose.model("User", userSchema);