import { z } from "zod";
import { CODIGOS_LINEA_INDICADOR, TIPOS_INDICADOR } from "@/lib/indicadores-config";
import { esClaveMes } from "@/lib/mes";

// Campos de un indicador: línea estratégica (L1 a L4), objetivo estratégico, tipo de
// indicador, el indicador y su meta (que puede ser "N/A").
const datosIndicador = z.object({
  lineaEstrategica: z.enum(CODIGOS_LINEA_INDICADOR, {
    errorMap: () => ({ message: "Selecciona una línea estratégica." }),
  }),
  descripcion: z.string().min(1, "El objetivo estratégico es obligatorio.").max(2000),
  tipoIndicador: z.enum(TIPOS_INDICADOR, {
    errorMap: () => ({ message: "Selecciona si el indicador es estratégico o de gestión." }),
  }),
  titulo: z.string().min(1, "El indicador es obligatorio.").max(300),
  meta: z.string().min(1, "La meta es obligatoria.").max(500),
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
