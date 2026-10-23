import { z } from "zod";

export const calificarDesempenoSchema = z.object({
  objetivoId: z.string().min(1, "Falta el identificador del objetivo."),
  calificacionFinal: z.coerce
    .number({ invalid_type_error: "El % de cumplimiento debe ser un número." })
    .min(0, "El % de cumplimiento no puede ser menor a 0.")
    .max(100, "El % de cumplimiento no puede ser mayor a 100."),
});

export const calificarDesarrolloSchema = z.object({
  objetivoId: z.string().min(1, "Falta el identificador del objetivo."),
  cumplioDesarrollo: z.boolean(),
});
