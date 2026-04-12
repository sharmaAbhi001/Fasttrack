import mongoose from "mongoose";
import { FaceData } from "../models/face_data.js";
import { Worker } from "../models/worker.js";
import {
  faceAiBaseUrl,
  faceAiPaths,
  forwardFaceServiceHealthGet,
  forwardMultipartToFaceAi,
  forwardJsonToFaceAi,
  forwardWorkerPhotoToFaceAi,
} from "../services/faceAi.client.js";

function tenantContext(req) {
  const { tenantId, userId, roleId } = req.userData || {};
  return { tenantId, userId, roleId };
}

function sendUpstreamResponse(expressRes, { status, contentType, body }) {
  expressRes.status(status);
  const ct = contentType || "";
  if (ct.includes("application/json")) {
    try {
      const json = JSON.parse(body);
      return expressRes.json(json);
    } catch {
      return expressRes.type("application/json").json({
        success: false,
        message: "Invalid JSON from face service",
        raw: body.slice(0, 500),
      });
    }
  }
  expressRes.type(ct || "text/plain").send(body);
}

function handleProxyError(res, err) {
  const code = err.statusCode || 500;
  return res.status(code).json({
    success: false,
    message: err.message || "Face AI proxy error",
  });
}

/** GET /health on Python (no API key on upstream). */
export const proxyFaceServiceHealth = async (req, res) => {
  try {
    const out = await forwardFaceServiceHealthGet();
    return sendUpstreamResponse(res, out);
  } catch (e) {
    return handleProxyError(res, e);
  }
};

/** Pure proxy: liveness (video / frames / image per your Python API). */
export const proxyLiveness = async (req, res) => {
  try {
    const paths = faceAiPaths();
    const out = await forwardMultipartToFaceAi(paths.liveness, req, tenantContext(req));
    return sendUpstreamResponse(res, out);
  } catch (e) {
    return handleProxyError(res, e);
  }
};

/** Proxy: generate embedding from face image. */
export const proxyEmbed = async (req, res) => {
  try {
    const paths = faceAiPaths();
    const out = await forwardMultipartToFaceAi(paths.embed, req, tenantContext(req));
    return sendUpstreamResponse(res, out);
  } catch (e) {
    return handleProxyError(res, e);
  }
};

/** Proxy: match face (multipart — image uploaded here). */
export const proxyMatchMultipart = async (req, res) => {
  try {
    const paths = faceAiPaths();
    const out = await forwardMultipartToFaceAi(paths.match, req, tenantContext(req));
    return sendUpstreamResponse(res, out);
  } catch (e) {
    return handleProxyError(res, e);
  }
};

/** Proxy: match using JSON body (e.g. { embedding: number[] }) — Python does vector search. */
export const proxyMatchJson = async (req, res) => {
  try {
    const paths = faceAiPaths();
    const out = await forwardJsonToFaceAi(
      paths.matchJson,
      req.body || {},
      tenantContext(req)
    );
    return sendUpstreamResponse(res, out);
  } catch (e) {
    return handleProxyError(res, e);
  }
};

/** Proxy: liveness + verification / match in one call (Python contract). */
export const proxyVerify = async (req, res) => {
  try {
    const paths = faceAiPaths();
    const out = await forwardMultipartToFaceAi(paths.verify, req, tenantContext(req));
    return sendUpstreamResponse(res, out);
  } catch (e) {
    return handleProxyError(res, e);
  }
};

/** Proxy: register in Python only (vector DB / gallery) — no Mongo write. */
export const proxyRegisterPython = async (req, res) => {
  try {
    const paths = faceAiPaths();
    const out = await forwardMultipartToFaceAi(paths.register, req, tenantContext(req));
    return sendUpstreamResponse(res, out);
  } catch (e) {
    return handleProxyError(res, e);
  }
};

/**
 * Orchestration: POST Python /register (multipart worker_id + image, X-API-Key),
 * then mirror registration in Mongo (embedding optional if Python only stores vectors server-side).
 */
export const registerWorkerFaceViaAiService = async (req, res) => {
  try {
    const { workerId } = req.params;
    const { tenantId } = req.userData;
    const paths = faceAiPaths();

    if (!mongoose.Types.ObjectId.isValid(workerId)) {
      return res.status(400).json({ success: false, message: "Invalid workerId" });
    }

    const worker = await Worker.findOne({ _id: workerId, tenantId });
    if (!worker) {
      return res.status(404).json({ success: false, message: "Worker not found" });
    }

    if (!faceAiBaseUrl()) {
      return res.status(503).json({
        success: false,
        message: "Face AI service is not configured (FACE_SERVICE_URL or FACE_AI_SERVICE_URL)",
      });
    }

    const files = req.files || [];
    const image =
      files.find((f) => f.mimetype && f.mimetype.startsWith("image/")) ||
      files.find((f) => /^(file|image|photo|picture)$/i.test(f.fieldname)) ||
      files[0];
    if (!image || !image.buffer) {
      return res.status(400).json({ success: false, message: "Image file is required (field: file)" });
    }

    const out = await forwardWorkerPhotoToFaceAi(paths.register, workerId, image, tenantContext(req));
    if (out.status >= 400) {
      return sendUpstreamResponse(res, out);
    }

    let data;
    try {
      data = out.body ? JSON.parse(out.body) : {};
    } catch {
      return res.status(502).json({
        success: false,
        message: "Face service did not return JSON",
        raw: out.body?.slice(0, 500),
      });
    }

    if (data && typeof data === "object" && data.error) {
      return res.status(400).json({
        success: false,
        message: typeof data.error === "string" ? data.error : "Face registration rejected",
        data,
      });
    }

    const embedding = Array.isArray(data.embedding) ? data.embedding : [];
    const faceImageUrl =
      (typeof data.image_url === "string" && data.image_url) ||
      (typeof data.imageUrl === "string" && data.imageUrl) ||
      req.body?.faceImageUrl ||
      `face-service://${workerId}`;

    const capturedAt = data.captured_at
      ? new Date(data.captured_at)
      : req.body?.capturedAt
        ? new Date(req.body.capturedAt)
        : new Date();

    if (Number.isNaN(capturedAt.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid capturedAt" });
    }

    const doc = await FaceData.findOneAndUpdate(
      { tenantId, workerId },
      {
        $set: {
          tenantId,
          workerId,
          faceImageUrl,
          faceEmbedding: embedding,
          capturedAt,
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    await Worker.updateOne(
      { _id: workerId, tenantId },
      { $set: { registrationComplete: true } }
    );

    return res.status(200).json({
      success: true,
      message: "Face registered via Python service and saved",
      data: {
        face: doc,
        ai: data,
      },
    });
  } catch (e) {
    return handleProxyError(res, e);
  }
};
