import { z } from "zod";

export const reportarAvanceSchema = z.object({
  objetivoId: z.string().min(1, "Falta el identificador del objetivo."),
  comentario: z
    .string()
    .min(1, "El comentario es obligatorio.")
    .max(2000, "El comentario es demasiado largo."),
});

export type ReportarAvanceInput = z.infer<typeof reportarAvanceSchema>;

// Solo para objetivos CORPORATIVO: además del comentario, el encargado
// publica un porcentaje de avance (0-100) visible para toda la organización.
export const reportarAvanceCorporativoSchema = reportarAvanceSchema.extend({
  porcentajeAvance: z.coerce
    .number({ invalid_type_error: "El porcentaje de avance debe ser un número." })
    .int("El porcentaje de avance debe ser un número entero.")
    .min(0, "El porcentaje de avance no puede ser menor a 0.")
    .max(100, "El porcentaje de avance no puede ser mayor a 100."),
});

export type ReportarAvanceCorporativoInput = z.infer<typeof reportarAvanceCorporativoSchema>;
