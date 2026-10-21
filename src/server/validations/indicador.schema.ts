import { z } from "zod";
import { esClaveMes } from "@/lib/mes";

const datosIndicador = z.object({
  titulo: z.string().min(1, "El nombre del indicador es obligatorio.").max(300),
  descripcion: z.string().min(1, "La descripción es obligatoria.").max(2000),
  meta: z.string().min(1, "La meta es obligatoria.").max(500),
  indicador: z.string().min(1, "Indica cómo se mide.").max(300),
  unidadMedida: z.string().min(1, "La unidad de medida es obligatoria.").max(50),
});

const objetivoId = z.string().min(1, "Falta el identificador del indicador.");

export const crearIndicadorSchema = datosIndicador;

export const editarIndicadorSchema = datosIndicador.extend({ objetivoId });

export const indicadorIdSchema = z.object({ objetivoId });

export const avanceMensualSchema = z.object({
  objetivoId,
  mes: z.string().refine(esClaveMes, "El mes no es válido."),
  porcentaje: z.coerce
    .number({ invalid_type_error: "El porcentaje debe ser un número." })
    .int("El porcentaje debe ser un número entero.")
    .min(0, "El porcentaje no puede ser menor a 0.")
    .max(100, "El porcentaje no puede ser mayor a 100."),
  comentario: z
    .string()
    .min(1, "El comentario es obligatorio.")
    .max(2000, "El comentario es demasiado largo."),
});

export const cumplimientoSchema = z.object({
  objetivoId,
  cumple: z.boolean(),
});
