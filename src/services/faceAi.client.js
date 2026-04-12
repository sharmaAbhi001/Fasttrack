/**
 * HTTP client to the Python face service (FastAPI).
 *
 * Base URL (first set wins):
 *   FACE_SERVICE_URL, FACE_AI_SERVICE_URL — e.g. http://127.0.0.1:8000 (no trailing slash)
 *
 * API key (sent as X-API-Key on POSTs when set; /health is called without it):
 *   FACE_SERVICE_API_KEY, FACE_AI_API_KEY, FACE_AI_SERVICE_API_KEY
 *
 * Optional path overrides (defaults shown):
 *   FACE_AI_PATH_LIVENESS=/liveness
 *   FACE_AI_PATH_EMBED=/embed
 *   FACE_AI_PATH_MATCH=/match
 *   FACE_AI_PATH_VERIFY=/verify
 *   FACE_AI_PATH_REGISTER=/register
 *
 * Register/verify contract (matches typical FastAPI worker service):
 *   POST multipart: worker_id, image (file bytes)
 *
 * Python may also read tenant scope from headers:
 *   X-Tenant-Id, X-User-Id, X-Role-Id
 *
 * Generic multipart proxy: same field names the client sends are forwarded as-is
 * plus optional tenant_* form fields and context headers.
 */

export function faceAiBaseUrl() {
  const u = (process.env.FACE_SERVICE_URL || process.env.FACE_AI_SERVICE_URL)?.trim();
  if (!u) return null;
  return u.replace(/\/$/, "");
}

export function faceAiApiKey() {
  return (
    process.env.FACE_SERVICE_API_KEY ||
    process.env.FACE_AI_API_KEY ||
    process.env.FACE_AI_SERVICE_API_KEY ||
    ""
  ).trim();
}

function buildFaceAiHeaders(ctx = {}, { includeApiKey = true } = {}) {
  const key = faceAiApiKey();
  return {
    ...(includeApiKey && key ? { "X-API-Key": key } : {}),
    ...(ctx.tenantId && { "X-Tenant-Id": String(ctx.tenantId) }),
    ...(ctx.userId && { "X-User-Id": String(ctx.userId) }),
    ...(ctx.roleId && { "X-Role-Id": String(ctx.roleId) }),
  };
}

export function faceAiPaths() {
  const match = process.env.FACE_AI_PATH_MATCH || "/match";
  return {
    liveness: process.env.FACE_AI_PATH_LIVENESS || "/liveness",
    embed: process.env.FACE_AI_PATH_EMBED || "/embed",
    match,
    matchJson: process.env.FACE_AI_PATH_MATCH_JSON || match,
    verify: process.env.FACE_AI_PATH_VERIFY || "/verify",
    register: process.env.FACE_AI_PATH_REGISTER || "/register",
  };
}

function normalizePath(path) {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function serviceUnavailableError() {
  const err = new Error(
    "Face AI service is not configured (set FACE_SERVICE_URL or FACE_AI_SERVICE_URL)"
  );
  err.statusCode = 503;
  return err;
}

/**
 * GET /health on the Python service (no API key).
 * @returns {{ status: number, contentType: string, body: string }}
 */
export async function forwardFaceServiceHealthGet() {
  const base = faceAiBaseUrl();
  if (!base) throw serviceUnavailableError();
  const url = `${base}/health`;
  const res = await fetch(url, { method: "GET" });
  const text = await res.text();
  return {
    status: res.status,
    contentType: res.headers.get("content-type") || "application/json",
    body: text,
  };
}

/**
 * POST multipart exactly as Python register/verify expect: worker_id + image.
 * @param {string} pythonPath e.g. "/register" or "/verify"
 * @param {string} workerId — sent as worker_id
 * @param {{ buffer: Buffer, mimetype?: string, originalname?: string }} file — multer file
 * @param {{ tenantId?: string, userId?: string, roleId?: string }} ctx
 */
export async function forwardWorkerPhotoToFaceAi(pythonPath, workerId, file, ctx = {}) {
  const base = faceAiBaseUrl();
  if (!base) throw serviceUnavailableError();
  if (!file?.buffer) {
    const err = new Error("Image file buffer required");
    err.statusCode = 400;
    throw err;
  }

  const url = `${base}${normalizePath(pythonPath)}`;
  const form = new FormData();
  form.append("worker_id", String(workerId));
  const blob = new Blob([file.buffer], {
    type: file.mimetype || "application/octet-stream",
  });
  form.append("image", blob, file.originalname || "face.jpg");

  const headers = {
    Accept: "application/json",
    ...buildFaceAiHeaders(ctx, { includeApiKey: true }),
  };

  const res = await fetch(url, { method: "POST", body: form, headers });
  const text = await res.text();
  return {
    status: res.status,
    contentType: res.headers.get("content-type") || "application/json",
    body: text,
  };
}

/**
 * @param {string} pythonPath e.g. "/embed"
 * @param {import('express').Request} req — expects multer: req.files, optional req.body
 * @param {{ tenantId?: string, userId?: string, roleId?: string }} ctx
 */
export async function forwardMultipartToFaceAi(pythonPath, req, ctx = {}) {
  const base = faceAiBaseUrl();
  if (!base) throw serviceUnavailableError();

  const url = `${base}${normalizePath(pythonPath)}`;
  const form = new FormData();

  for (const f of req.files || []) {
    const blob = new Blob([f.buffer], {
      type: f.mimetype || "application/octet-stream",
    });
    form.append(f.fieldname, blob, f.originalname || "upload");
  }

  for (const [k, v] of Object.entries(req.body || {})) {
    if (v == null) continue;
    if (typeof v === "object" && !Array.isArray(v)) {
      form.append(k, JSON.stringify(v));
    } else {
      form.append(k, String(v));
    }
  }

  if (ctx.tenantId) form.append("tenant_id", String(ctx.tenantId));
  if (ctx.userId) form.append("user_id", String(ctx.userId));
  if (ctx.roleId) form.append("role_id", String(ctx.roleId));

  const headers = {
    Accept: "application/json",
    ...buildFaceAiHeaders(ctx, { includeApiKey: true }),
  };

  const res = await fetch(url, { method: "POST", body: form, headers });
  const text = await res.text();
  return {
    status: res.status,
    contentType: res.headers.get("content-type") || "application/json",
    body: text,
  };
}

/**
 * JSON POST to Python (e.g. match using an embedding produced client-side or by a prior /embed call).
 */
export async function forwardJsonToFaceAi(pythonPath, payload, ctx = {}) {
  const base = faceAiBaseUrl();
  if (!base) throw serviceUnavailableError();

  const url = `${base}${normalizePath(pythonPath)}`;
  const body = {
    ...payload,
    ...(ctx.tenantId != null && { tenant_id: String(ctx.tenantId) }),
    ...(ctx.userId != null && { user_id: String(ctx.userId) }),
  };

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...buildFaceAiHeaders(ctx, { includeApiKey: true }),
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return {
    status: res.status,
    contentType: res.headers.get("content-type") || "application/json",
    body: text,
  };
}
