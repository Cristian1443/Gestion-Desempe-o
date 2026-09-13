import { z } from "zod";

const objetivoCorporativoSchema = z.object({
  titulo: z.string().min(1, "El título es obligatorio.").max(300),
  descripcion: z.string().min(1, "La descripción es obligatoria.").max(2000),
  meta: z.string().min(1, "La meta es obligatoria.").max(500),
  indicador: z.string().min(1, "El indicador es obligatorio.").max(300),
  unidadMedida: z.string().min(1, "La unidad de medida es obligatoria.").max(50),
});

export const objetivosCorporativosSchema = z.object({
  objetivos: z
    .array(objetivoCorporativoSchema)
    .length(8, "Debes cargar exactamente 8 objetivos corporativos."),
});
