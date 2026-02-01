import mongoose,{Schema} from "mongoose";


const roleTemplateSchema  = new Schema({
        name: {
        type: String,
        required: true,
    },
    defaultPermissions: [{
    type: Schema.Types.ObjectId,
    ref: "Permission"
  }],
    },{timestamps: true});
    



    export const RoleTemplate = mongoose.models.RoleTemplate || mongoose.model("RoleTemplate", roleTemplateSchema);