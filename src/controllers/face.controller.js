import mongoose from "mongoose";
import { FaceData } from "../models/face_data.js";
import { Worker } from "../models/worker.js";

export const registerOrUpdateFace = async (req, res) => {
  try {
    const { workerId } = req.params;
    const { tenantId } = req.userData;
    const { faceImageUrl, faceEmbedding, capturedAt } = req.body;

    if (!mongoose.Types.ObjectId.isValid(workerId)) {
      return res.status(400).json({ success: false, message: "Invalid workerId" });
    }

    const worker = await Worker.findOne({ _id: workerId, tenantId });
    if (!worker) {
      return res.status(404).json({ success: false, message: "Worker not found" });
    }

    const at = capturedAt ? new Date(capturedAt) : new Date();
    if (Number.isNaN(at.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid capturedAt" });
    }

    const doc = await FaceData.findOneAndUpdate(
      { tenantId, workerId },
      {
        $set: {
          tenantId,
          workerId,
          faceImageUrl,
          faceEmbedding,
          capturedAt: at,
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Face data saved",
      data: doc,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getFaceByWorker = async (req, res) => {
  try {
    const { workerId } = req.params;
    const { tenantId } = req.userData;

    if (!mongoose.Types.ObjectId.isValid(workerId)) {
      return res.status(400).json({ success: false, message: "Invalid workerId" });
    }

    const face = await FaceData.findOne({ tenantId, workerId }).select(
      "-faceEmbedding"
    );

    if (!face) {
      return res.status(404).json({ success: false, message: "No face data for worker" });
    }

    return res.status(200).json({ success: true, data: face });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getFaceEmbeddingForMatch = async (req, res) => {
  try {
    const { workerId } = req.params;
    const { tenantId } = req.userData;

    if (!mongoose.Types.ObjectId.isValid(workerId)) {
      return res.status(400).json({ success: false, message: "Invalid workerId" });
    }

    const face = await FaceData.findOne({ tenantId, workerId });
    if (!face) {
      return res.status(404).json({ success: false, message: "No face data for worker" });
    }

    return res.status(200).json({
      success: true,
      data: { workerId, faceEmbedding: face.faceEmbedding, capturedAt: face.capturedAt },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteFace = async (req, res) => {
  try {
    const { workerId } = req.params;
    const { tenantId } = req.userData;

    const result = await FaceData.deleteOne({ tenantId, workerId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "No face data to delete" });
    }
    return res.status(200).json({ success: true, message: "Face data removed" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
