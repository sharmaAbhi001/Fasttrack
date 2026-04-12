import { z } from "zod";

export const faceRegisterSchema = z
  .object({
    faceImageUrl: z.string().min(1, "faceImageUrl required"),
    faceEmbedding: z.array(z.number()).min(1),
    capturedAt: z.union([z.string(), z.date()]).optional(),
  })
  .strict();
