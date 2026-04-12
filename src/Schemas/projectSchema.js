

import { z } from "zod";


export const projectCreateSchema = z.object({
    projectName: z.string().min(3, "Project name should be at least 3 characters long"),
    location: z.string().min(3, "Location should be at least 3 characters long"),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
});

export const projectUpdateSchema = z
  .object({
    projectName: z.string().min(3).optional(),
    location: z.string().min(3).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .strict();