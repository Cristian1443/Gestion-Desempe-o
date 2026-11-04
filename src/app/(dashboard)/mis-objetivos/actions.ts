"use server";

import { revalidatePath } from "next/cache";
import { requireUsuarioAutenticado } from "@/server/auth/rbac";
import { ErrorAprobacion, proponerObjetivosIndividuales } from "@/server/services/aprobaciones.service";
import { ErrorEvidencia, guardarEvidencia } from "@/server/services/evidencias.service";
import { proponerObjetivosSchema } from "@/server/validations/aprobacion.schema";
import { guardarEvidenciaSchema } from "@/server/validations/seguimiento.schema";

export type EstadoAccionReporte = { ok: true } | { ok: false; error: string };

export async function accionProponerObjetivos(objetivos: unknown): Promise<EstadoAccionReporte> {
  const usuario = await requireUsuarioAutenticado();

  const parsed = proponerObjetivosSchema.safeParse({ objetivos });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await proponerObjetivosIndividuales(usuario.usuarioId, parsed.data.objetivos);
  } catch (error) {
    if (error instanceof ErrorAprobacion) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: "Ocurrió un error inesperado al enviar la propuesta." };
  }

  revalidatePath("/mis-objetivos");
  revalidatePath("/mi-equipo");
  return { ok: true };
}

// Acciones realizadas de un objetivo propio, para el próximo seguimiento (solo antes de que empiece).
export async function accionGuardarEvidencia(input: unknown): Promise<EstadoAccionReporte> {
  const usuario = await requireUsuarioAutenticado();

  const parsed = guardarEvidenciaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await guardarEvidencia({ usuarioId: usuario.usuarioId, ...parsed.data });
  } catch (error) {
    if (error instanceof ErrorEvidencia) return { ok: false, error: error.message };
    return { ok: false, error: "Ocurrió un error inesperado al guardar las acciones realizadas." };
  }

  revalidatePath("/mis-objetivos");
  revalidatePath("/mi-equipo");
  return { ok: true };
}
