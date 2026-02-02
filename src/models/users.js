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

// users schema
userSchema.index({ authId: 1, tenantId: 1 }, { unique: true }); //Indexes: { authId: 1, tenantId: 1 } UNIQUE

export const User = mongoose.models.User || mongoose.model("User", userSchema);