"use server";

import { revalidatePath } from "next/cache";
import { requireRol } from "@/server/auth/rbac";
import {
  ErrorPeriodo,
  abrirPeriodo,
  agregarSeguimiento,
  cerrarPeriodo,
  crearPeriodo,
  definirFranjaCumplimiento,
  editarSeguimiento,
  eliminarSeguimiento,
} from "@/server/services/periodos.service";
import {
  agregarSeguimientoSchema,
  crearPeriodoSchema,
  editarSeguimientoSchema,
  franjaCumplimientoSchema,
  periodoIdSchema,
  seguimientoIdSchema,
} from "@/server/validations/periodo.schema";

export type EstadoAccionAdmin = { ok: true } | { ok: false; error: string };

function revalidarVistas() {
  revalidatePath("/administracion");
  revalidatePath("/mis-objetivos");
  revalidatePath("/mi-equipo");
  revalidatePath("/mi-gerencia");
  revalidatePath("/resultados");
  revalidatePath("/indicadores");
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

async function ejecutarAdminPeriodo<T>(
  schema: { safeParse(input: unknown): { success: true; data: T } | { success: false; error: { issues: Array<{ message: string }> } } },
  input: unknown,
  accion: (datos: T) => Promise<unknown>,
  mensajeInesperado: string,
): Promise<EstadoAccionAdmin> {
  await requireRol("GESTION_HUMANA", "ADMIN");

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await accion(parsed.data);
  } catch (error) {
    if (error instanceof ErrorPeriodo) return { ok: false, error: error.message };
    return { ok: false, error: mensajeInesperado };
  }

  revalidarVistas();
  return { ok: true };
}

export async function accionAbrirPeriodo(periodoId: string): Promise<EstadoAccionAdmin> {
  return ejecutarAdminPeriodo(
    periodoIdSchema,
    { periodoId },
    (d) => abrirPeriodo(d.periodoId),
    "Ocurrió un error inesperado al abrir el periodo.",
  );
}

export async function accionCerrarPeriodo(periodoId: string): Promise<EstadoAccionAdmin> {
  return ejecutarAdminPeriodo(
    periodoIdSchema,
    { periodoId },
    (d) => cerrarPeriodo(d.periodoId),
    "Ocurrió un error inesperado al cerrar el periodo.",
  );
}

export async function accionAgregarSeguimiento(input: unknown): Promise<EstadoAccionAdmin> {
  return ejecutarAdminPeriodo(
    agregarSeguimientoSchema,
    input,
    agregarSeguimiento,
    "Ocurrió un error inesperado al agregar el seguimiento.",
  );
}

export async function accionEditarSeguimiento(input: unknown): Promise<EstadoAccionAdmin> {
  return ejecutarAdminPeriodo(
    editarSeguimientoSchema,
    input,
    editarSeguimiento,
    "Ocurrió un error inesperado al editar el seguimiento.",
  );
}

export async function accionEliminarSeguimiento(seguimientoId: string): Promise<EstadoAccionAdmin> {
  return ejecutarAdminPeriodo(
    seguimientoIdSchema,
    { seguimientoId },
    (d) => eliminarSeguimiento(d.seguimientoId),
    "Ocurrió un error inesperado al eliminar el seguimiento.",
  );
}

export async function accionDefinirFranjaCumplimiento(input: unknown): Promise<EstadoAccionAdmin> {
  return ejecutarAdminPeriodo(
    franjaCumplimientoSchema,
    input,
    definirFranjaCumplimiento,
    "Ocurrió un error inesperado al guardar la franja del resultado final.",
  );
}
