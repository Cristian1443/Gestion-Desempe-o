import { z } from "zod";

export const registrarSeguimientoSchema = z.object({
  objetivoId: z.string().min(1, "Falta el identificador del objetivo."),
  comentario: z
    .string()
    .min(1, "El comentario es obligatorio.")
    .max(2000, "El comentario es demasiado largo."),
});

export type RegistrarSeguimientoInput = z.infer<typeof registrarSeguimientoSchema>;

// Seguimiento de un indicador de gerencia: además del comentario lleva el % de
// avance acumulado de ese seguimiento.
export const registrarSeguimientoGerenciaSchema = registrarSeguimientoSchema.extend({
  porcentaje: z.coerce
    .number({ invalid_type_error: "El porcentaje debe ser un número." })
    .int("El porcentaje debe ser un número entero.")
    .min(0, "El porcentaje no puede ser menor a 0.")
    .max(100, "El porcentaje no puede ser mayor a 100."),
});

export type RegistrarSeguimientoGerenciaInput = z.infer<typeof registrarSeguimientoGerenciaSchema>;
