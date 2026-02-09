import express from "express";
import {
    createOrRequestAdvance,
    requestAdvance,
    getAdvanceStatus,
    approveAdvance,
    rejectAdvance,
    getPendingAdvances
} from "../controllers/advance.controller.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
import { advanceCreateSchema, advanceRejectSchema } from "../Schemas/advanceSchema.js";

const router = express.Router();

// Test route
router.get("/", (req, res) => {
    res.send("Advance route is working");
});

/**
 * POST /api/advance/add
 * Create or request advance
 * Amount < daily wage = direct (auto-approved)
 * Amount >= daily wage = request (needs approval)
 */
router.post("/add", validateRequest(advanceCreateSchema), createOrRequestAdvance);

/**
 * POST /api/advance/request
 * Request advance (for amounts >= daily wage)
 */
router.post("/request", validateRequest(advanceCreateSchema), requestAdvance);

/**
 * GET /api/advance/status
 * Get advance status
 * Query params: advanceId OR workerId (optional, if not provided returns all)
 */
router.get("/status", getAdvanceStatus);

/**
 * GET /api/advance/pending
 * Get pending advance requests (for approval)
 */
router.get("/pending", getPendingAdvances);

/**
 * POST /api/advance/approve/:advanceId
 * Approve advance request
 */
router.post("/approve/:advanceId", approveAdvance);

/**
 * POST /api/advance/reject/:advanceId
 * Reject advance request
 */
router.post("/reject/:advanceId", validateRequest(advanceRejectSchema), rejectAdvance);

export default router;