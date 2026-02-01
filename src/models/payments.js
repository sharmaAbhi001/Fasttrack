import mongoose ,{Schema} from "mongoose";




const paymentSchema = new Schema({
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
    payrollId:{
        type:Schema.Types.ObjectId,
        ref:"Payroll",
        required:true,
    },
    amountPaid: {
        type: Number,
        required: true,
    },
    paymentMethod: {
        type: String,
        required: true,
    },
    paymentDate: {
        type: Date,
        required: true,
    },

},{timestamps: true})

export const Payment = mongoose.model.Payment || mongoose.model("Payment",paymentSchema)    