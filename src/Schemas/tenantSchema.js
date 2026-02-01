import {z} from "zod";


export const tenantCreateSchema = z.object({
  name: z.string()
    .min(3, "Name should be at least 3 characters long")
    .max(50, "Name is too long"),
    
  email: z.string()
    .email("Please enter a valid email"),
    
  password: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "At least one uppercase letter")
    .regex(/[0-9]/, "At least one number"),
    
  phone: z.string()
    .regex(/^\+91[6-9]\d{9}$/, "Enter a valid phone number Start with +91"),
    
  address: z.string()
    .min(10, "Address should be at least 10 characters long")
    .max(200, "Address is too long"),
    
  companyName: z.string()
    .min(3, "Company name should be at least 3 characters long"),
    
  gstNumber: z.string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST Number format")
});