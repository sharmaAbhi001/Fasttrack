import mongoose, {Schema} from "mongoose";



const permissionSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    code: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
},{timestamps: true});


export const Permission = mongoose.models.Permission || mongoose.model("Permission", permissionSchema);