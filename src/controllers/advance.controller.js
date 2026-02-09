import { Advance } from '../models/advance.js';
import { Worker } from '../models/worker.js';
import { Wages } from '../models/wages.js';
import { Attendance } from '../models/attendance.js';
import { User } from '../models/users.js';
import mongoose from 'mongoose';

/**
 * Get current day working salary for a worker
 * Based on daily wage
 */
const getCurrentDayWorkingSalary = async (workerId, tenantId, date) => {
    try {
        const wageRecord = await Wages.findOne({
            workerId,
            tenantId,
            effectiveFromDate: { $lte: date },
            $or: [
                { effectiveToDate: null },
                { effectiveToDate: { $gte: date } }
            ]
        }).sort({ effectiveFromDate: -1 });

        return wageRecord ? wageRecord.dailyWage : 0;
    } catch (error) {
        throw error;
    }
};

/**
 * Create or Request Advance
 * Type 1: Direct advance if amount < daily working salary (auto-approved)
 * Type 2: Request advance if amount >= daily working salary (needs approval)
 */
export const createOrRequestAdvance = async (req, res) => {
    const { workerId, projectId, amount, reason, date } = req.body;
    const { tenantId, userId } = req.userData;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Validate worker exists
        const worker = await Worker.findOne({
            _id: workerId,
            tenantId
        }).session(session);

        if (!worker) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: "Worker not found"
            });
        }

        // Get current day working salary
        const currentDayWage = await getCurrentDayWorkingSalary(
            workerId,
            tenantId,
            new Date(date)
        );

        if (currentDayWage === 0) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "No wage record found for this worker on the given date"
            });
        }

        

        // Determine advance type and status
        const advanceType = amount < currentDayWage ? 'direct' : 'request';
        const status = advanceType === 'direct' ? 'approved' : 'pending';

        // Create advance
        const advance = await Advance.create([{
            tenantId,
            projectId,
            workerId,
            amount,
            date: new Date(date),
            reason,
            status,
            advanceType,
            requestedBy: userId,
            approvedBy: advanceType === 'direct' ? userId : null,
            approvedAt: advanceType === 'direct' ? new Date() : null
        }], { session });

        await session.commitTransaction();

        res.status(201).json({
            success: true,
            message: advanceType === 'direct' 
                ? "Advance approved and disbursed directly" 
                : "Advance request submitted for approval",
            data: advance[0],
            advanceType
        });
    } catch (error) {
        await session.abortTransaction();
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Error creating advance: " + error.message
        });
    } finally {
        session.endSession();
    }
};

/**
 * Request Advance
 * Create a pending advance request (for amounts >= daily wage)
 */
export const requestAdvance = async (req, res) => {
    const { workerId, projectId, amount, reason, date } = req.body;
    const { tenantId, userId } = req.userData;

    try {
        // Validate worker exists
        const worker = await Worker.findOne({
            _id: workerId,
            tenantId
        });

        if (!worker) {
            return res.status(404).json({
                success: false,
                message: "Worker not found"
            });
        }

        // Get current day working salary
        const currentDayWage = await getCurrentDayWorkingSalary(
            workerId,
            tenantId,
            new Date(date)
        );

        if (currentDayWage === 0) {
            return res.status(400).json({
                success: false,
                message: "No wage record found for this worker"
            });
        }

        // Create pending advance request
        const advance = await Advance.create({
            tenantId,
            projectId,
            workerId,
            amount,
            date: new Date(date),
            reason,
            status: 'pending',
            advanceType: 'request',
            requestedBy: userId
        });

        res.status(201).json({
            success: true,
            message: "Advance request submitted for approval",
            data: advance
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Error requesting advance: " + error.message
        });
    }
};

/**
 * Get Advance Status
 * Get all advances for a worker or specific advance by ID
 * Can filter by projectId as additional parameter
 */
export const getAdvanceStatus = async (req, res) => {
    const { workerId, advanceId, projectId } = req.query;
    const { tenantId } = req.userData;

    try {
        let advances;

        if (advanceId) {
            // Get specific advance
            advances = await Advance.findOne({
                _id: advanceId,
                tenantId
            })
                .populate('workerId', 'name code phone')
                .populate('projectId', 'name code')
                .populate('approvedBy', 'name email')
                .populate('requestedBy', 'name email');
        } else if (workerId) {
            // Get all advances for a worker
            const query = { workerId, tenantId };
            if (projectId) query.projectId = projectId;
            
            advances = await Advance.find(query)
                .populate('workerId', 'name code phone')
                .populate('projectId', 'name code')
                .populate('approvedBy', 'name email')
                .populate('requestedBy', 'name email')
                .sort({ createdAt: -1 });
        } else if (projectId) {
            // Get all advances for a project
            advances = await Advance.find({ projectId, tenantId })
                .populate('workerId', 'name code phone')
                .populate('projectId', 'name code')
                .populate('approvedBy', 'name email')
                .populate('requestedBy', 'name email')
                .sort({ createdAt: -1 });
        } else {
            // Get all advances in tenant
            advances = await Advance.find({ tenantId })
                .populate('workerId', 'name code phone')
                .populate('projectId', 'name code')
                .populate('approvedBy', 'name email')
                .populate('requestedBy', 'name email')
                .sort({ createdAt: -1 });
        }

        if (!advances || advances.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No advances found"
            });
        }

        res.status(200).json({
            success: true,
            data: advances,
            count: Array.isArray(advances) ? advances.length : 1
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Error fetching advance status: " + error.message
        });
    }
};

/**
 * Approve Advance Request
 * Only for pending advances (type: request)
 */
export const approveAdvance = async (req, res) => {
    const { advanceId } = req.params;
    const { tenantId, userId } = req.userData;

    try {
        // Find advance
        const advance = await Advance.findOne({
            _id: advanceId,
            tenantId
        });

        if (!advance) {
            return res.status(404).json({
                success: false,
                message: "Advance not found"
            });
        }

        // Only approve pending request type advances
        if (advance.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot approve advance with status: ${advance.status}`
            });
        }

        if (advance.advanceType === 'direct') {
            return res.status(400).json({
                success: false,
                message: "Direct advances cannot be approved (already approved automatically)"
            });
        }

        // Update advance status
        advance.status = 'approved';
        advance.approvedBy = userId;
        advance.approvedAt = new Date();
        await advance.save();

        res.status(200).json({
            success: true,
            message: "Advance approved successfully",
            data: advance
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Error approving advance: " + error.message
        });
    }
};

/**
 * Reject Advance Request
 * Only for pending advances (type: request)
 */
export const rejectAdvance = async (req, res) => {
    const { advanceId } = req.params;
    const { rejectionReason } = req.body;
    const { tenantId, userId } = req.userData;

    try {
        // Find advance
        const advance = await Advance.findOne({
            _id: advanceId,
            tenantId
        });

        if (!advance) {
            return res.status(404).json({
                success: false,
                message: "Advance not found"
            });
        }

        // Only reject pending request type advances
        if (advance.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot reject advance with status: ${advance.status}`
            });
        }

        if (advance.advanceType === 'direct') {
            return res.status(400).json({
                success: false,
                message: "Direct advances cannot be rejected (already approved automatically)"
            });
        }

        // Update advance status
        advance.status = 'rejected';
        advance.rejectedBy = userId;
        advance.rejectionReason = rejectionReason;
        advance.rejectedAt = new Date();
        await advance.save();

        res.status(200).json({
            success: true,
            message: "Advance rejected successfully",
            data: advance
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Error rejecting advance: " + error.message
        });
    }
};

/**
 * Get Pending Advance Requests (for approval)
 */
export const getPendingAdvances = async (req, res) => {
    const { tenantId } = req.userData;

    try {
        const pendingAdvances = await Advance.find({
            tenantId,
            status: 'pending',
            advanceType: 'request'
        })
            .populate('workerId', 'name code phone')
            .populate('requestedBy', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: pendingAdvances,
            count: pendingAdvances.length
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Error fetching pending advances: " + error.message
        });
    }
};




