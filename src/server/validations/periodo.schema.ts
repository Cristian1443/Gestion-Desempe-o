import { z } from "zod";

export const crearPeriodoSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio.").max(50),
  fechaInicio: z.coerce.date({ invalid_type_error: "Fecha de inicio inválida." }),
  fechaFin: z.coerce.date({ invalid_type_error: "Fecha de fin inválida." }),
});

export const periodoIdSchema = z.object({
  periodoId: z.string().min(1),
});

export const agregarSeguimientoSchema = z.object({
  periodoId: z.string().min(1),
  fechaInicio: z.coerce.date({ invalid_type_error: "Fecha de inicio inválida." }),
  fechaFin: z.coerce.date({ invalid_type_error: "Fecha de fin inválida." }),
});

export const seguimientoIdSchema = z.object({
  seguimientoId: z.string().min(1),
});

export const editarSeguimientoSchema = z.object({
  seguimientoId: z.string().min(1),
  fechaInicio: z.coerce.date({ invalid_type_error: "Fecha de inicio inválida." }),
  fechaFin: z.coerce.date({ invalid_type_error: "Fecha de fin inválida." }),
});

const nombreActividad = z.string().trim().min(1, "El nombre de la actividad es obligatorio.").max(100);

export const agregarActividadSchema = z.object({
  periodoId: z.string().min(1),
  nombre: nombreActividad,
  fechaInicio: z.coerce.date({ invalid_type_error: "Fecha de inicio inválida." }),
  fechaFin: z.coerce.date({ invalid_type_error: "Fecha de fin inválida." }),
});

export const editarActividadSchema = z.object({
  actividadId: z.string().min(1),
  nombre: nombreActividad,
  fechaInicio: z.coerce.date({ invalid_type_error: "Fecha de inicio inválida." }),
  fechaFin: z.coerce.date({ invalid_type_error: "Fecha de fin inválida." }),
});

export const actividadIdSchema = z.object({
  actividadId: z.string().min(1),
});

export const franjaCumplimientoSchema = z.object({
  periodoId: z.string().min(1),
  fechaInicio: z.coerce.date({ invalid_type_error: "Fecha de inicio inválida." }),
  fechaFin: z.coerce.date({ invalid_type_error: "Fecha de fin inválida." }),
});
