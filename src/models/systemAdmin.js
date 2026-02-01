import mongoose, {Schema} from "mongoose";
import bcrypt from "bcrypt"



const systemAdminSchema = new Schema({
    name:{
        type:String,
        required:true,
    },
    authId:{
        type:Schema.Types.ObjectId,
        ref:"UserAuth",
        required:true,
    },
    role:{
        type:String,
        enum:['super_admin'],
        default:'super_admin',
    },

    
},{timestamps:true});







export const SystemAdmin = mongoose.model.SystemAdmin ||   mongoose.model("SystemAdmin",systemAdminSchema);


