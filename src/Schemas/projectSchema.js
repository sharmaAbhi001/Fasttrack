

import { z } from "zod";


export const projectCreateSchema = z.object({
    projectName: z.string().min(3, "Project name should be at least 3 characters long"),
    location: z.string().min(3, "Location should be at least 3 characters long"),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
});