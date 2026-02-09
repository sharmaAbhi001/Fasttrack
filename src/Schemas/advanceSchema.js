import { z } from "zod";

/**
 * Schema for creating or requesting advance
 * Amount < daily wage = direct (auto-approved)
 * Amount >= daily wage = request (needs approval)
 */
export const advanceCreateSchema = z.object({
    workerId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, "Invalid worker ID format")
        .describe("Worker ID (MongoDB ObjectId)"),
    projectId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, "Invalid project ID format")
        .describe("Project ID (MongoDB ObjectId)"),
    amount: z
        .number()
        .positive("Amount must be greater than 0")
        .describe("Advance amount"),
    reason: z
        .string()
        .min(5, "Reason must be at least 5 characters long")
        .max(500, "Reason must not exceed 500 characters")
        .describe("Reason for advance request"),
    date: z
        .string()
        .datetime()
        .or(z.date())
        .transform(val => new Date(val))
        .refine(date => date <= new Date(), "Date cannot be in the future")
        .describe("Date of advance request"),
}).strict();

/**
 * Schema for rejecting advance
 */
export const advanceRejectSchema = z.object({
    rejectionReason: z
        .string()
        .min(5, "Rejection reason must be at least 5 characters long")
        .max(500, "Rejection reason must not exceed 500 characters")
        .describe("Reason for rejecting the advance"),
}).strict();

/**
 * Schema for advance query parameters
 */
export const advanceStatusQuerySchema = z.object({
    workerId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, "Invalid worker ID format")
        .optional()
        .describe("Worker ID filter"),
    advanceId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, "Invalid advance ID format")
        .optional()
        .describe("Specific advance ID"),
}).refine(
    data => !(data.workerId && data.advanceId),
    "Cannot provide both workerId and advanceId"
);
