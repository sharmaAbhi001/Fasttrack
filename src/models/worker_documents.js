
import mongoose ,{Schema} from "mongoose";



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
    documentUrl: {
        type: String,   
    },
    uploadedAt: {
        type: Date,
        required: true,
    }
},{timestamps: true});

export const WorkerDocument = mongoose.models.WorkerDocument || mongoose.model("WorkerDocument", workerDocumentSchema);