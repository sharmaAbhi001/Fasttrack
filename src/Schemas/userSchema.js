import {z} from "zod";




export const userCreateSchema = z.object({

    name: z.string().min(3, "Name should be at least 3 characters long"),
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    phone: z.string().regex(/^\+91[6-9]\d{9}$/, "Enter a valid phone number Start with +91"),
    address: z.string().min(10, "Address should be at least 10 characters long"),
    roleId: z
    .string().regex(/^[0-9a-fA-F]{24}$/, "Invalid role id format"),
});