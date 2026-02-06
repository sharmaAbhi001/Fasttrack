
import mongoose ,{Schema} from "mongoose";
import { encrypt } from "../utils/encryption.js";



const workerDocumentSchema = new Schema({
    workerId: {
        type: Schema.Types.ObjectId,
        ref: "Worker",
        required: true,
    },
    documentType: {
        type: String,
        required: true, 
    },
    documentNumber: {
        type: String,
        required: true, 
    },
    documentUrl: {
        type: String,   
    },
    uploadedAt: {
        type: Date,
        required: true,
    }
},{timestamps: true});


workerDocumentSchema.pre('save', function(next) {
   if (this.isModified('documentNumber')) {
       this.documentNumber = encrypt(this.documentNumber);
   }
});

export const WorkerDocument = mongoose.models.WorkerDocument || mongoose.model("WorkerDocument", workerDocumentSchema);