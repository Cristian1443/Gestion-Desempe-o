"use server";

import { revalidatePath } from "next/cache";
import { requireRol } from "@/server/auth/rbac";
import {
  ErrorAprobacion,
  aprobarObjetivosIndividuales,
  devolverObjetivosIndividuales,
} from "@/server/services/aprobaciones.service";
import {
  ErrorCalificacion,
  calificarObjetivoDesarrollo,
  calificarObjetivoDesempeno,
} from "@/server/services/calificaciones.service";
import { obtenerPeriodoActual } from "@/server/services/periodos.service";
import { ErrorSeguimiento, registrarSeguimientoIndividual } from "@/server/services/seguimientos.service";
import { devolverObjetivosSchema } from "@/server/validations/aprobacion.schema";
import { calificarDesarrolloSchema, calificarDesempenoSchema } from "@/server/validations/calificacion.schema";
import { registrarSeguimientoIndividualSchema } from "@/server/validations/seguimiento.schema";

export type EstadoAccionEquipo = { ok: true } | { ok: false; error: string };

function revalidarVistas() {
  revalidatePath("/mi-equipo");
  revalidatePath("/mis-objetivos");
}

export async function accionAprobarObjetivos(usuarioId: string): Promise<EstadoAccionEquipo> {
  const jefe = await requireRol("JEFE");

  const periodo = await obtenerPeriodoActual();
  if (!periodo) {
    return { ok: false, error: "No hay un periodo abierto." };
  }

  try {
    await aprobarObjetivosIndividuales(usuarioId, periodo.id, jefe.usuarioId);
  } catch (error) {
    if (error instanceof ErrorAprobacion) return { ok: false, error: error.message };
    return { ok: false, error: "Ocurrió un error inesperado al aprobar." };
  }

  revalidarVistas();
  return { ok: true };
}

export async function accionDevolverObjetivos(
  usuarioId: string,
  comentario: string,
): Promise<EstadoAccionEquipo> {
  const jefe = await requireRol("JEFE");

  const parsed = devolverObjetivosSchema.safeParse({ usuarioId, comentario });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const periodo = await obtenerPeriodoActual();
  if (!periodo) {
    return { ok: false, error: "No hay un periodo abierto." };
  }

  try {
    await devolverObjetivosIndividuales(
      parsed.data.usuarioId,
      periodo.id,
      jefe.usuarioId,
      parsed.data.comentario,
    );
  } catch (error) {
    if (error instanceof ErrorAprobacion) return { ok: false, error: error.message };
    return { ok: false, error: "Ocurrió un error inesperado al devolver los objetivos." };
  }

  revalidarVistas();
  return { ok: true };
}

export async function accionRegistrarSeguimiento(
  objetivoId: string,
  _estadoPrevio: { ok: true } | { ok: false; error: string },
  formData: FormData,
): Promise<EstadoAccionEquipo> {
  const jefe = await requireRol("JEFE");

  const parsed = registrarSeguimientoIndividualSchema.safeParse({
    objetivoId,
    comentario: formData.get("comentario"),
    porcentaje: formData.get("porcentaje"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await registrarSeguimientoIndividual({ ...parsed.data, jefeId: jefe.usuarioId });
  } catch (error) {
    if (error instanceof ErrorSeguimiento) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: "Ocurrió un error inesperado al registrar el seguimiento." };
  }

  revalidarVistas();
  return { ok: true };
}

// Resultado final de un objetivo de desempeño: el % de cumplimiento (de ahí sale Cumple / No cumple).
export async function accionCalificarDesempeno(objetivoId: string, calificacionFinal: number): Promise<EstadoAccionEquipo> {
  const jefe = await requireRol("JEFE");

  const parsed = calificarDesempenoSchema.safeParse({ objetivoId, calificacionFinal });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await calificarObjetivoDesempeno({ ...parsed.data, jefeId: jefe.usuarioId });
  } catch (error) {
    if (error instanceof ErrorCalificacion) return { ok: false, error: error.message };
    return { ok: false, error: "Ocurrió un error inesperado al guardar el resultado." };
  }

  revalidarVistas();
  return { ok: true };
}

export async function accionCalificarDesarrollo(
  objetivoId: string,
  cumplioDesarrollo: boolean,
): Promise<EstadoAccionEquipo> {
  const jefe = await requireRol("JEFE");

  const parsed = calificarDesarrolloSchema.safeParse({ objetivoId, cumplioDesarrollo });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await calificarObjetivoDesarrollo({ ...parsed.data, jefeId: jefe.usuarioId });
  } catch (error) {
    if (error instanceof ErrorCalificacion) return { ok: false, error: error.message };
    return { ok: false, error: "Ocurrió un error inesperado al guardar el resultado final." };
  }

  revalidarVistas();
  return { ok: true };
}
