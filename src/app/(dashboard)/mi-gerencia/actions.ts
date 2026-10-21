"use server";

import { revalidatePath } from "next/cache";
import { requireRol } from "@/server/auth/rbac";
import { ErrorCalificacion, calificarObjetivoGerencia } from "@/server/services/calificaciones.service";
import { ErrorGerencia, crearObjetivosGerencia } from "@/server/services/gerencia.service";
import { ErrorSeguimiento, registrarSeguimientoGerencia } from "@/server/services/seguimientos.service";
import { calificarDesempenoSchema } from "@/server/validations/calificacion.schema";
import { objetivosGerenciaSchema } from "@/server/validations/gerencia.schema";
import { registrarSeguimientoSchema } from "@/server/validations/seguimiento.schema";

export type EstadoAccionGerencia = { ok: true } | { ok: false; error: string };

export async function accionCrearObjetivosGerencia(objetivos: unknown): Promise<EstadoAccionGerencia> {
  const gerente = await requireRol("GERENTE");

  const parsed = objetivosGerenciaSchema.safeParse({ objetivos });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await crearObjetivosGerencia(gerente.usuarioId, parsed.data.objetivos);
  } catch (error) {
    if (error instanceof ErrorGerencia) return { ok: false, error: error.message };
    return { ok: false, error: "Ocurrió un error inesperado al cargar los objetivos." };
  }

  revalidatePath("/mi-gerencia");
  revalidatePath("/mis-objetivos");
  return { ok: true };
}

export async function accionCalificarGerencia(
  objetivoId: string,
  calificacionFinal: number,
): Promise<EstadoAccionGerencia> {
  const gerente = await requireRol("GERENTE");

  const parsed = calificarDesempenoSchema.safeParse({ objetivoId, calificacionFinal });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await calificarObjetivoGerencia({ ...parsed.data, gerenteId: gerente.usuarioId });
  } catch (error) {
    if (error instanceof ErrorCalificacion) return { ok: false, error: error.message };
    return { ok: false, error: "Ocurrió un error inesperado al guardar el % de cumplimiento." };
  }

  revalidatePath("/mi-gerencia");
  revalidatePath("/mis-objetivos");
  return { ok: true };
}

export async function accionRegistrarSeguimientoGerencia(
  _estadoPrevio: EstadoAccionGerencia,
  formData: FormData,
): Promise<EstadoAccionGerencia> {
  const gerente = await requireRol("GERENTE");

  const parsed = registrarSeguimientoSchema.safeParse({
    objetivoId: formData.get("objetivoId"),
    comentario: formData.get("comentario"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await registrarSeguimientoGerencia({ ...parsed.data, gerenteId: gerente.usuarioId });
  } catch (error) {
    if (error instanceof ErrorSeguimiento) return { ok: false, error: error.message };
    return { ok: false, error: "Ocurrió un error inesperado al guardar el seguimiento." };
  }

  revalidatePath("/mi-gerencia");
  revalidatePath("/mis-objetivos");
  return { ok: true };
}
