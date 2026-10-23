import { z } from "zod";
import { CODIGOS_LINEA_ESTRATEGICA } from "@/lib/lineas-estrategicas";
import { CANTIDAD_DESARROLLO_ACTIVA, PESO_TOTAL_INDIVIDUALES } from "@/lib/objetivos-config";
import { CANTIDAD_OBJETIVOS_DESEMPENO } from "@/server/services/calculo-notas";

const camposComunesObjetivoIndividual = {
  descripcion: z.string().min(1, "La descripción es obligatoria.").max(2000),
  acciones: z.string().min(1, "Las acciones son obligatorias.").max(2000),
  indicador: z.string().min(1, "El indicador es obligatorio.").max(300),
  linkRepositorio: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : undefined)),
};

export const objetivoDesempenoSchema = z.object({
  ...camposComunesObjetivoIndividual,
  tipoIndividual: z.literal("DESEMPENO"),
  meta: z.string().trim().min(1, "La meta es obligatoria.").max(500),
  peso: z
    .number({ invalid_type_error: "El peso debe ser un número." })
    .min(0.01, "El peso debe ser mayor a 0.")
    .max(100, "El peso no puede ser mayor a 100."),
  lineaEstrategica: z.enum(CODIGOS_LINEA_ESTRATEGICA, {
    errorMap: () => ({ message: "Selecciona una línea estratégica." }),
  }),
});

// Los objetivos de desarrollo no llevan peso: no compiten por porcentaje
// dentro de la nota individual, solo se registran (ver calculo-notas.ts).
export const objetivoDesarrolloSchema = z.object({
  ...camposComunesObjetivoIndividual,
  tipoIndividual: z.literal("DESARROLLO"),
  competencia: z.string().min(1, "La competencia es obligatoria.").max(300),
});

export const objetivoPropuestoSchema = z.discriminatedUnion("tipoIndividual", [
  objetivoDesempenoSchema,
  objetivoDesarrolloSchema,
]);

export const proponerObjetivosSchema = z.object({
  objetivos: z
    .array(objetivoPropuestoSchema)
    .refine(
      (objetivos) => objetivos.filter((o) => o.tipoIndividual === "DESEMPENO").length === CANTIDAD_OBJETIVOS_DESEMPENO,
      `Debes proponer exactamente ${CANTIDAD_OBJETIVOS_DESEMPENO} objetivos de desempeño.`,
    )
    .refine(
      (objetivos) => objetivos.filter((o) => o.tipoIndividual === "DESARROLLO").length === CANTIDAD_DESARROLLO_ACTIVA,
      CANTIDAD_DESARROLLO_ACTIVA === 0
        ? "Los objetivos de desarrollo no se manejan este año."
        : `Debes proponer exactamente ${CANTIDAD_DESARROLLO_ACTIVA} objetivos de desarrollo.`,
    )
    .refine((objetivos) => {
      const suma = objetivos
        .filter((o) => o.tipoIndividual === "DESEMPENO")
        .reduce((acc, o) => acc + Math.round(o.peso * 100), 0);
      return suma === Math.round(PESO_TOTAL_INDIVIDUALES * 100);
    }, `La suma de los pesos de los objetivos de desempeño debe ser ${PESO_TOTAL_INDIVIDUALES} %.`),
});

export const aprobarObjetivosSchema = z.object({
  usuarioId: z.string().min(1),
});

export const devolverObjetivosSchema = z.object({
  usuarioId: z.string().min(1),
  comentario: z
    .string()
    .min(1, "Explica qué debe ajustar el colaborador antes de reenviar.")
    .max(2000),
});
