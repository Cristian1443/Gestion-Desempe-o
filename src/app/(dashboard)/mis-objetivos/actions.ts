"use server";

import { revalidatePath } from "next/cache";
import { requireUsuarioAutenticado } from "@/server/auth/rbac";
import { ErrorAprobacion, proponerObjetivosIndividuales } from "@/server/services/aprobaciones.service";
import { proponerObjetivosSchema } from "@/server/validations/aprobacion.schema";

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
