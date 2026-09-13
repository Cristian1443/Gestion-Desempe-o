import { z } from "zod";

export const crearPeriodoSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio.").max(50),
  fechaInicio: z.coerce.date({ invalid_type_error: "Fecha de inicio inválida." }),
  fechaFin: z.coerce.date({ invalid_type_error: "Fecha de fin inválida." }),
});

export const agregarCorteSchema = z.object({
  periodoId: z.string().min(1),
  nombre: z.string().min(1, "El nombre del corte es obligatorio.").max(100),
  fechaLimite: z.coerce.date({ invalid_type_error: "Fecha límite inválida." }),
});

export const periodoIdSchema = z.object({
  periodoId: z.string().min(1),
});

export const corteIdSchema = z.object({
  corteId: z.string().min(1),
});

export const editarCorteSchema = z.object({
  corteId: z.string().min(1),
  nombre: z.string().min(1, "El nombre del corte es obligatorio.").max(100),
  fechaLimite: z.coerce.date({ invalid_type_error: "Fecha límite inválida." }),
});
