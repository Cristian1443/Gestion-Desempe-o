import { z } from "zod";

export const registrarSeguimientoSchema = z.object({
  objetivoId: z.string().min(1, "Falta el identificador del objetivo."),
  comentario: z
    .string()
    .min(1, "El comentario es obligatorio.")
    .max(2000, "El comentario es demasiado largo."),
});

export type RegistrarSeguimientoInput = z.infer<typeof registrarSeguimientoSchema>;
