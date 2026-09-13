import { z } from "zod";

const objetivoGerenciaSchema = z.object({
  titulo: z.string().min(1, "El título es obligatorio.").max(300),
  descripcion: z.string().min(1, "La descripción es obligatoria.").max(2000),
  meta: z.string().min(1, "La meta es obligatoria.").max(500),
  indicador: z.string().min(1, "El indicador es obligatorio.").max(300),
  unidadMedida: z.string().min(1, "La unidad de medida es obligatoria.").max(50),
});

export const objetivosGerenciaSchema = z.object({
  objetivos: z
    .array(objetivoGerenciaSchema)
    .length(2, "Debes cargar exactamente 2 objetivos de gerencia."),
});
