import { z } from "zod";

export const projectSupervisorCreateSchema = z.object({
  userId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid user id format"),
  projectId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid project id format"),
  supervisorRole: z
    .enum(["Site Supervisor", "Project Manager", "Team Lead", "Supervisor"])
    .default("Supervisor"),
});

export const projectSupervisorUpdateSchema = z.object({
  supervisorRole: z
    .enum(["Site Supervisor", "Project Manager", "Team Lead", "Supervisor"])
    .optional(),
  status: z
    .enum(["active", "inactive"])
    .optional(),
});
