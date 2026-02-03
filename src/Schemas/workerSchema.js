import { z } from "zod";

export const workerCreateSchema = z.object({
    name: z.string().min(3, "Name should be at least 3 characters long"),
    phone: z.string().regex(/^\+91[6-9]\d{9}$/, "Enter a valid phone number starting with +91"),
    address: z.string().min(5, "Address should be at least 5 characters long").optional(),
    joinDate: z.coerce.date("Invalid join date"),
    status: z.enum(["active", "inactive"]).default("active").optional(),
});

export const workerUpdateSchema = z.object({
    name: z.string().min(3, "Name should be at least 3 characters long").optional(),
    phone: z.string().regex(/^\+91[6-9]\d{9}$/, "Enter a valid phone number starting with +91").optional(),
    address: z.string().min(5, "Address should be at least 5 characters long").optional(),
    status: z.enum(["active", "inactive"]).optional(),
});
