import mongoose ,{Schema} from "mongoose";



const roleSchema = new Schema({
  tenantId:{
    type:Schema.Types.ObjectId,
    ref:"Tenant",
    required:true,
    index:true
  },
  name:{type:String,required:true},
  isSystem:{
    type:Boolean,
    default:false // owner/admin roles protected
  }
},{timestamps:true});

roleSchema.index({tenantId:1,name:1},{unique:true});

export const Role =
 mongoose.models.Role ||
 mongoose.model("Role", roleSchema);