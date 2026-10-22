import { z } from "zod";

export const calificarDesempenoSchema = z.object({
  objetivoId: z.string().min(1, "Falta el identificador del objetivo."),
  cumple: z.boolean(),
});

export const calificarDesarrolloSchema = z.object({
  objetivoId: z.string().min(1, "Falta el identificador del objetivo."),
  cumplioDesarrollo: z.boolean(),
});
