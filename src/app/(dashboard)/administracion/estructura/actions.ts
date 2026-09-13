"use server";

import { revalidatePath } from "next/cache";
import { requireRol } from "@/server/auth/rbac";
import {
  ErrorOrganizacion,
  actualizarUsuario,
  asignarGerente,
  crearGerencia,
  crearUsuario,
} from "@/server/services/organizacion.service";
import {
  actualizarUsuarioSchema,
  asignarGerenteSchema,
  crearGerenciaSchema,
  crearUsuarioSchema,
} from "@/server/validations/organizacion.schema";

export type EstadoAccionOrganizacion = { ok: true } | { ok: false; error: string };

function revalidarVistas() {
  revalidatePath("/administracion/estructura");
  revalidatePath("/login");
}

function normalizar(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor : null;
}

export async function accionCrearGerencia(input: { nombre: string }): Promise<EstadoAccionOrganizacion> {
  await requireRol("GESTION_HUMANA", "ADMIN");

  const parsed = crearGerenciaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await crearGerencia(parsed.data.nombre);
  } catch (error) {
    if (error instanceof ErrorOrganizacion) return { ok: false, error: error.message };
    return { ok: false, error: "Ocurrió un error inesperado al crear la gerencia." };
  }

  revalidarVistas();
  return { ok: true };
}

export async function accionAsignarGerente(
  gerenciaId: string,
  usuarioId: string,
): Promise<EstadoAccionOrganizacion> {
  await requireRol("GESTION_HUMANA", "ADMIN");

  const parsed = asignarGerenteSchema.safeParse({ gerenciaId, usuarioId });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await asignarGerente(parsed.data.gerenciaId, parsed.data.usuarioId);
  } catch (error) {
    if (error instanceof ErrorOrganizacion) return { ok: false, error: error.message };
    return { ok: false, error: "Ocurrió un error inesperado al asignar el gerente." };
  }

  revalidarVistas();
  return { ok: true };
}

export async function accionCrearUsuario(input: unknown): Promise<EstadoAccionOrganizacion> {
  await requireRol("GESTION_HUMANA", "ADMIN");

  const parsed = crearUsuarioSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await crearUsuario({
      nombre: parsed.data.nombre,
      email: parsed.data.email,
      cargo: normalizar(parsed.data.cargo),
      gerenciaId: normalizar(parsed.data.gerenciaId),
      jefeId: normalizar(parsed.data.jefeId),
      roles: parsed.data.roles,
    });
  } catch (error) {
    if (error instanceof ErrorOrganizacion) return { ok: false, error: error.message };
    return { ok: false, error: "Ocurrió un error inesperado al crear el usuario." };
  }

  revalidarVistas();
  return { ok: true };
}

export async function accionActualizarUsuario(input: unknown): Promise<EstadoAccionOrganizacion> {
  await requireRol("GESTION_HUMANA", "ADMIN");

  const parsed = actualizarUsuarioSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await actualizarUsuario(parsed.data.usuarioId, {
      cargo: normalizar(parsed.data.cargo),
      gerenciaId: normalizar(parsed.data.gerenciaId),
      jefeId: normalizar(parsed.data.jefeId),
      roles: parsed.data.roles,
      activo: parsed.data.activo,
    });
  } catch (error) {
    if (error instanceof ErrorOrganizacion) return { ok: false, error: error.message };
    return { ok: false, error: "Ocurrió un error inesperado al actualizar el usuario." };
  }

  revalidarVistas();
  return { ok: true };
}
