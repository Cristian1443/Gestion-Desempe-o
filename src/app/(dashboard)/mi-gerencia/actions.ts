"use server";

import { revalidatePath } from "next/cache";
import { requireRol } from "@/server/auth/rbac";
import {
  ErrorGerencia,
  crearIndicadorGerencia,
  editarIndicadorGerencia,
  eliminarIndicadorGerencia,
  marcarCumplimientoGerencia,
} from "@/server/services/gerencia.service";
import { ErrorSeguimiento, registrarSeguimientoGerencia } from "@/server/services/seguimientos.service";
import {
  crearIndicadorSchema,
  cumplimientoSchema,
  editarIndicadorSchema,
  indicadorIdSchema,
} from "@/server/validations/indicador.schema";
import { registrarSeguimientoGerenciaSchema } from "@/server/validations/seguimiento.schema";

export type EstadoAccionGerencia = { ok: true } | { ok: false; error: string };

function revalidarVistas() {
  revalidatePath("/mi-gerencia");
  revalidatePath("/mis-objetivos");
  revalidatePath("/resultados");
}

// Solo el gerente de la gerencia carga y hace seguimiento a sus indicadores; que
// sea el gerente *de esa* gerencia lo valida el servicio.
async function ejecutar<T>(
  schema: { safeParse(input: unknown): { success: true; data: T } | { success: false; error: { issues: Array<{ message: string }> } } },
  input: unknown,
  accion: (datos: T, gerenteId: string) => Promise<unknown>,
  mensajeInesperado: string,
): Promise<EstadoAccionGerencia> {
  const gerente = await requireRol("GERENTE");

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await accion(parsed.data, gerente.usuarioId);
  } catch (error) {
    if (error instanceof ErrorGerencia || error instanceof ErrorSeguimiento) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: mensajeInesperado };
  }

  revalidarVistas();
  return { ok: true };
}

export async function accionCrearIndicadorGerencia(input: unknown): Promise<EstadoAccionGerencia> {
  return ejecutar(
    crearIndicadorSchema,
    input,
    (datos, gerenteId) => crearIndicadorGerencia(gerenteId, datos),
    "Ocurrió un error inesperado al agregar el indicador.",
  );
}

export async function accionEditarIndicadorGerencia(input: unknown): Promise<EstadoAccionGerencia> {
  return ejecutar(
    editarIndicadorSchema,
    input,
    ({ objetivoId, ...datos }, gerenteId) => editarIndicadorGerencia(gerenteId, objetivoId, datos),
    "Ocurrió un error inesperado al editar el indicador.",
  );
}

export async function accionEliminarIndicadorGerencia(objetivoId: string): Promise<EstadoAccionGerencia> {
  return ejecutar(
    indicadorIdSchema,
    { objetivoId },
    (datos, gerenteId) => eliminarIndicadorGerencia(gerenteId, datos.objetivoId),
    "Ocurrió un error inesperado al eliminar el indicador.",
  );
}

export async function accionRegistrarSeguimientoGerencia(input: unknown): Promise<EstadoAccionGerencia> {
  return ejecutar(
    registrarSeguimientoGerenciaSchema,
    input,
    (datos, gerenteId) => registrarSeguimientoGerencia({ ...datos, gerenteId }),
    "Ocurrió un error inesperado al guardar el seguimiento.",
  );
}

export async function accionMarcarCumplimientoGerencia(
  objetivoId: string,
  cumple: boolean,
): Promise<EstadoAccionGerencia> {
  return ejecutar(
    cumplimientoSchema,
    { objetivoId, cumple },
    (datos, gerenteId) => marcarCumplimientoGerencia({ ...datos, gerenteId }),
    "Ocurrió un error inesperado al guardar el resultado.",
  );
}
