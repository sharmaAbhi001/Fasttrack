import mongoose,{Schema} from "mongoose";



const faceDataSchema = new Schema({
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
    faceImageUrl: {
        type: String,
        required: true,
    },
    capturedAt: {
        type: Date,
        required: true,
    },
    faceEmbedding: {
        type: [Number],
        required: true,
    },
},{timestamps: true});

export const FaceData = mongoose.models.FaceData || mongoose.model("FaceData", faceDataSchema);