"use server";

import { revalidatePath } from "next/cache";
import { requireRol } from "@/server/auth/rbac";
import {
  ErrorIndicador,
  crearIndicador,
  editarIndicador,
  eliminarIndicador,
  marcarCumplimiento,
  registrarAvanceMensual,
} from "@/server/services/indicadores.service";
import {
  avanceMensualSchema,
  crearIndicadorSchema,
  cumplimientoSchema,
  editarIndicadorSchema,
  indicadorIdSchema,
} from "@/server/validations/indicador.schema";

export type EstadoAccionIndicador = { ok: true } | { ok: false; error: string };

// Quién carga y hace el seguimiento de los indicadores: el Gestor corporativo
// (hoy Andrea Jimenez) y, como respaldo, Talento Humano y Admin. Todos los
// demás los ven en solo lectura.
const ROLES_EDITORES = ["GESTOR_CORPORATIVO", "GESTION_HUMANA", "ADMIN"] as const;

function revalidarVistas() {
  revalidatePath("/indicadores");
  revalidatePath("/mis-objetivos");
  revalidatePath("/resultados");
}

async function ejecutar<T>(
  schema: { safeParse(input: unknown): { success: true; data: T } | { success: false; error: { issues: Array<{ message: string }> } } },
  input: unknown,
  accion: (datos: T, usuarioId: string) => Promise<unknown>,
  mensajeInesperado: string,
): Promise<EstadoAccionIndicador> {
  const usuario = await requireRol(...ROLES_EDITORES);

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await accion(parsed.data, usuario.usuarioId);
  } catch (error) {
    if (error instanceof ErrorIndicador) return { ok: false, error: error.message };
    return { ok: false, error: mensajeInesperado };
  }

  revalidarVistas();
  return { ok: true };
}

export async function accionCrearIndicador(input: unknown): Promise<EstadoAccionIndicador> {
  return ejecutar(
    crearIndicadorSchema,
    input,
    (datos, usuarioId) => crearIndicador({ ...datos, creadoPor: usuarioId }),
    "Ocurrió un error inesperado al agregar el indicador.",
  );
}

export async function accionEditarIndicador(input: unknown): Promise<EstadoAccionIndicador> {
  return ejecutar(editarIndicadorSchema, input, (datos) => editarIndicador(datos), "Ocurrió un error inesperado al editar el indicador.");
}

export async function accionEliminarIndicador(objetivoId: string): Promise<EstadoAccionIndicador> {
  return ejecutar(
    indicadorIdSchema,
    { objetivoId },
    (datos) => eliminarIndicador(datos.objetivoId),
    "Ocurrió un error inesperado al eliminar el indicador.",
  );
}

export async function accionRegistrarAvance(input: unknown): Promise<EstadoAccionIndicador> {
  return ejecutar(
    avanceMensualSchema,
    input,
    (datos, usuarioId) => registrarAvanceMensual({ ...datos, registradoPor: usuarioId }),
    "Ocurrió un error inesperado al guardar el avance.",
  );
}

export async function accionMarcarCumplimiento(objetivoId: string, cumple: boolean): Promise<EstadoAccionIndicador> {
  return ejecutar(
    cumplimientoSchema,
    { objetivoId, cumple },
    (datos, usuarioId) => marcarCumplimiento({ ...datos, marcadoPor: usuarioId }),
    "Ocurrió un error inesperado al guardar el resultado.",
  );
}
