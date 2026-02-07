import { z } from "zod";

export const workerCreateSchema = z.object({
    code: z.string().min(1, "Code is required"),
    name: z.string().min(3, "Name should be at least 3 characters long"),
    phone: z.string().regex(/^\+91[6-9]\d{9}$/, "Enter a valid phone number starting with +91"),
    address: z.string().min(5, "Address should be at least 5 characters long").optional(),
    joinDate: z.coerce.date("Invalid join date"),
    status: z.enum(["active", "inactive"]).default("active").optional(),
    documentType: z.string().min(3, "Document type should be at least 3 characters long"),
    // documentNumber: z.string().regex(/^([A-Z]{5}[0-9]{4}[A-Z]{1}|[2-9]{1}[0-9]{11})$/, "Add only aadhar and pan card numbers").optional(),
});

export const workerUpdateSchema = z.object({
    code: z.string().min(1, "Code is required").optional(),
    name: z.string().min(3, "Name should be at least 3 characters long").optional(),
    phone: z.string().regex(/^\+91[6-9]\d{9}$/, "Enter a valid phone number starting with +91").optional(),
    address: z.string().min(5, "Address should be at least 5 characters long").optional(),
    status: z.enum(["active", "inactive"]).optional(),
});

export const workerAssignProjectSchema = z.object({
    projectId: z.string().min(1, "Project ID is required"),
    tenantId: z.string().min(1, "Tenant ID is required"),
    workerId: z.string().min(1, "Worker ID is required"),
    startDate: z.coerce.date("Invalid start date").optional(),
    endDate: z.coerce.date("Invalid end date").optional(),
    workerWages: z.number().positive("Worker wages must be a positive number and is required"),
});
