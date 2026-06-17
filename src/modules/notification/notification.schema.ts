import { z } from "zod";

export const markNotificationAsSchema = z.object({
  query: z.object({
    ceaId: z.string().min(1, "ceaId is required").transform(Number),
    status: z.enum(["READ", "SENT"], {
      error: "Status must be READ or SENT",
    }),
  }),
});
