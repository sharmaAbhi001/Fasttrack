import mongoose, { Schema } from "mongoose";  



const tenantSchema = new Schema({
    name:{
       type:String,
       required:true, 
    },
    companyName:{
        type:String,
    },
  gSTNumber:{
    type:String
    },
    address:{
        type:String
    },
    status:{
        type:String,
        enum:["active","inactive"],
        default:"active",
    },
},{timestamps:true});

export const Tenant = mongoose.model.Tenant || mongoose.model("Tenant",tenantSchema);