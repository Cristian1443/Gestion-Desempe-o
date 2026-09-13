"use server";

import { revalidatePath } from "next/cache";
import { requireRol } from "@/server/auth/rbac";
import { ErrorCalificacion, calificarObjetivoCorporativo } from "@/server/services/calificaciones.service";
import { ErrorCorporativo, crearObjetivosCorporativos } from "@/server/services/corporativos.service";
import {
  ErrorPeriodo,
  abrirCorte,
  abrirPeriodo,
  agregarCorte,
  cerrarCorte,
  cerrarPeriodo,
  crearPeriodo,
  editarCorte,
  eliminarCorte,
  pasarPeriodoAEvaluacion,
} from "@/server/services/periodos.service";
import { ErrorSeguimiento, reportarAvanceCorporativo } from "@/server/services/seguimientos.service";
import { calificarDesempenoSchema } from "@/server/validations/calificacion.schema";
import { objetivosCorporativosSchema } from "@/server/validations/corporativo.schema";
import {
  agregarCorteSchema,
  corteIdSchema,
  crearPeriodoSchema,
  editarCorteSchema,
  periodoIdSchema,
} from "@/server/validations/periodo.schema";
import { reportarAvanceCorporativoSchema } from "@/server/validations/seguimiento.schema";

export type EstadoAccionAdmin = { ok: true } | { ok: false; error: string };

function revalidarVistas() {
  revalidatePath("/administracion");
  revalidatePath("/mis-objetivos");
  revalidatePath("/mi-equipo");
  revalidatePath("/mi-gerencia");
}

export async function accionCrearObjetivosCorporativos(objetivos: unknown): Promise<EstadoAccionAdmin> {
  const admin = await requireRol("GESTION_HUMANA", "ADMIN", "GESTOR_CORPORATIVO");

  const parsed = objetivosCorporativosSchema.safeParse({ objetivos });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await crearObjetivosCorporativos(admin.usuarioId, parsed.data.objetivos);
  } catch (error) {
    if (error instanceof ErrorCorporativo) return { ok: false, error: error.message };
    return { ok: false, error: "Ocurrió un error inesperado al cargar los objetivos." };
  }

  revalidarVistas();
  return { ok: true };
}

export async function accionReportarAvanceCorporativo(
  _estadoPrevio: EstadoAccionAdmin,
  formData: FormData,
): Promise<EstadoAccionAdmin> {
  const admin = await requireRol("GESTION_HUMANA", "ADMIN", "GESTOR_CORPORATIVO");

  const parsed = reportarAvanceCorporativoSchema.safeParse({
    objetivoId: formData.get("objetivoId"),
    comentario: formData.get("comentario"),
    porcentajeAvance: formData.get("porcentajeAvance"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await reportarAvanceCorporativo({ ...parsed.data, registradoPor: admin.usuarioId });
  } catch (error) {
    if (error instanceof ErrorSeguimiento) return { ok: false, error: error.message };
    return { ok: false, error: "Ocurrió un error inesperado al guardar el reporte." };
  }

  revalidarVistas();
  return { ok: true };
}

// A diferencia de crear/reportar (abiertas también a GESTOR_CORPORATIVO), la
// calificación final queda reservada a Gestión Humana/Admin — mismo alcance
// que las transiciones de periodo de esta misma pantalla.
export async function accionCalificarCorporativo(
  objetivoId: string,
  calificacionFinal: number,
): Promise<EstadoAccionAdmin> {
  const admin = await requireRol("GESTION_HUMANA", "ADMIN");

  const parsed = calificarDesempenoSchema.safeParse({ objetivoId, calificacionFinal });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await calificarObjetivoCorporativo({ ...parsed.data, adminId: admin.usuarioId });
  } catch (error) {
    if (error instanceof ErrorCalificacion) return { ok: false, error: error.message };
    return { ok: false, error: "Ocurrió un error inesperado al guardar la calificación." };
  }

  revalidarVistas();
  return { ok: true };
}

export async function accionCrearPeriodo(input: unknown): Promise<EstadoAccionAdmin> {
  await requireRol("GESTION_HUMANA", "ADMIN");

  const parsed = crearPeriodoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await crearPeriodo(parsed.data);
  } catch (error) {
    if (error instanceof ErrorPeriodo) return { ok: false, error: error.message };
    return { ok: false, error: "Ocurrió un error inesperado al crear el periodo." };
  }

  revalidatePath("/administracion");
  return { ok: true };
}

export async function accionAgregarCorte(input: unknown): Promise<EstadoAccionAdmin> {
  await requireRol("GESTION_HUMANA", "ADMIN");

  const parsed = agregarCorteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await agregarCorte(parsed.data);
  } catch (error) {
    if (error instanceof ErrorPeriodo) return { ok: false, error: error.message };
    return { ok: false, error: "Ocurrió un error inesperado al agregar el corte." };
  }

  revalidatePath("/administracion");
  return { ok: true };
}

async function transicionarPeriodo(
  periodoId: unknown,
  accion: (periodoId: string) => Promise<unknown>,
): Promise<EstadoAccionAdmin> {
  await requireRol("GESTION_HUMANA", "ADMIN");

  const parsed = periodoIdSchema.safeParse({ periodoId });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await accion(parsed.data.periodoId);
  } catch (error) {
    if (error instanceof ErrorPeriodo) return { ok: false, error: error.message };
    return { ok: false, error: "Ocurrió un error inesperado." };
  }

  revalidarVistas();
  return { ok: true };
}

export async function accionAbrirPeriodo(periodoId: string): Promise<EstadoAccionAdmin> {
  return transicionarPeriodo(periodoId, abrirPeriodo);
}

export async function accionPasarAEvaluacion(periodoId: string): Promise<EstadoAccionAdmin> {
  return transicionarPeriodo(periodoId, pasarPeriodoAEvaluacion);
}

export async function accionCerrarPeriodo(periodoId: string): Promise<EstadoAccionAdmin> {
  return transicionarPeriodo(periodoId, cerrarPeriodo);
}

async function transicionarCorte(
  corteId: unknown,
  accion: (corteId: string) => Promise<unknown>,
): Promise<EstadoAccionAdmin> {
  await requireRol("GESTION_HUMANA", "ADMIN");

  const parsed = corteIdSchema.safeParse({ corteId });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await accion(parsed.data.corteId);
  } catch (error) {
    if (error instanceof ErrorPeriodo) return { ok: false, error: error.message };
    return { ok: false, error: "Ocurrió un error inesperado." };
  }

  revalidarVistas();
  return { ok: true };
}

export async function accionAbrirCorte(corteId: string): Promise<EstadoAccionAdmin> {
  return transicionarCorte(corteId, abrirCorte);
}

export async function accionCerrarCorte(corteId: string): Promise<EstadoAccionAdmin> {
  return transicionarCorte(corteId, cerrarCorte);
}

export async function accionEditarCorte(input: unknown): Promise<EstadoAccionAdmin> {
  await requireRol("GESTION_HUMANA", "ADMIN");

  const parsed = editarCorteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await editarCorte(parsed.data);
  } catch (error) {
    if (error instanceof ErrorPeriodo) return { ok: false, error: error.message };
    return { ok: false, error: "Ocurrió un error inesperado al editar el corte." };
  }

  revalidarVistas();
  return { ok: true };
}

export async function accionEliminarCorte(corteId: string): Promise<EstadoAccionAdmin> {
  return transicionarCorte(corteId, eliminarCorte);
}
