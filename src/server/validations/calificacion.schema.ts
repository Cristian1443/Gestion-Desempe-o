import { z } from "zod";

export const calificarDesempenoSchema = z.object({
  objetivoId: z.string().min(1, "Falta el identificador del objetivo."),
  calificacionFinal: z.coerce
    .number({ invalid_type_error: "La calificación debe ser un número." })
    .min(0, "La calificación no puede ser menor a 0.")
    .max(100, "La calificación no puede ser mayor a 100."),
});

export const calificarDesarrolloSchema = z.object({
  objetivoId: z.string().min(1, "Falta el identificador del objetivo."),
  cumplioDesarrollo: z.boolean(),
});
