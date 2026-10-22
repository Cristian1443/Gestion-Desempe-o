import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { formatearFecha } from "@/lib/fecha";
import { obtenerContextoFranjas } from "@/server/services/periodos.service";
import type {
  RegistrarSeguimientoGerenciaInput,
  RegistrarSeguimientoInput,
} from "@/server/validations/seguimiento.schema";

export class ErrorSeguimiento extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErrorSeguimiento";
  }
}

// El seguimiento en el que se puede registrar hoy: el que Gestión Humana
// definió con una franja que incluye la fecha de hoy. Fuera de toda franja
// nadie registra; el mensaje dice cuándo vuelve a abrirse.
async function exigirSeguimientoEnCurso(periodoId: string) {
  const { seguimientoEnCurso, proximoSeguimiento } = await obtenerContextoFranjas(periodoId);
  if (seguimientoEnCurso) return seguimientoEnCurso;

  if (proximoSeguimiento) {
    throw new ErrorSeguimiento(
      `No hay un seguimiento en curso. El seguimiento ${proximoSeguimiento.numero} es del ${formatearFecha(
        proximoSeguimiento.fechaInicio,
      )} al ${formatearFecha(proximoSeguimiento.fechaFin)}.`,
    );
  }
  throw new ErrorSeguimiento(
    "No hay un seguimiento en curso y no quedan más seguimientos programados en este periodo.",
  );
}

// Núcleo compartido: crea la siguiente versión del registro (comentario +
// fecha) de un (objetivo, seguimiento), sin importar el nivel del objetivo.
// Nunca actualiza una fila existente — quien hace el seguimiento puede
// corregir su comentario dentro de la franja creando una versión nueva, que
// queda como la vigente; el historial completo se conserva.
async function crearSiguienteVersionRegistro(
  objetivoId: string,
  seguimientoId: string,
  registradoPor: string,
  comentario: string,
  porcentaje: number | null = null,
) {
  const ultimo = await db.registroSeguimiento.findFirst({
    where: { objetivoId, seguimientoId },
    orderBy: { version: "desc" },
  });

  try {
    return await db.registroSeguimiento.create({
      data: {
        objetivoId,
        seguimientoId,
        version: ultimo ? ultimo.version + 1 : 1,
        porcentaje,
        comentario,
        registradoPor,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ErrorSeguimiento("Se guardó otro registro al mismo tiempo. Recarga la página e inténtalo de nuevo.");
    }
    throw error;
  }
}

// Seguimiento de un objetivo INDIVIDUAL, registrado directamente por el jefe
// directo del dueño del objetivo (no es un autorreporte del colaborador: el
// jefe hace el seguimiento a su equipo durante el periodo y, con base en
// esos seguimientos, pone el % de cumplimiento al final).
export async function registrarSeguimientoIndividual(
  input: RegistrarSeguimientoInput & { jefeId: string },
) {
  const objetivo = await db.objetivo.findUnique({
    where: { id: input.objetivoId },
    include: { periodo: true, usuario: true },
  });

  if (!objetivo) {
    throw new ErrorSeguimiento("El objetivo no existe.");
  }
  if (objetivo.nivel !== "INDIVIDUAL" || objetivo.usuario?.jefeId !== input.jefeId) {
    throw new ErrorSeguimiento("No eres el jefe directo del dueño de este objetivo.");
  }
  if (objetivo.estadoAprobacion !== "APROBADO") {
    throw new ErrorSeguimiento("Solo puedes registrar seguimiento sobre objetivos ya aprobados.");
  }
  if (objetivo.periodo.estado !== "ABIERTO") {
    throw new ErrorSeguimiento("El periodo no está abierto para registrar seguimiento.");
  }

  const seguimiento = await exigirSeguimientoEnCurso(objetivo.periodoId);

  return crearSiguienteVersionRegistro(objetivo.id, seguimiento.id, input.jefeId, input.comentario);
}

// Seguimiento de un indicador de GERENCIA, hecho por el gerente del área (no
// hay un dueño individual: el indicador aplica a toda la gerencia). Lleva el %
// de avance acumulado y un comentario.
export async function registrarSeguimientoGerencia(
  input: RegistrarSeguimientoGerenciaInput & { gerenteId: string },
) {
  const objetivo = await db.objetivo.findUnique({
    where: { id: input.objetivoId },
    include: { periodo: true, gerencia: true },
  });

  if (!objetivo) {
    throw new ErrorSeguimiento("El objetivo no existe.");
  }
  if (objetivo.nivel !== "GERENCIA" || objetivo.gerencia?.gerenteId !== input.gerenteId) {
    throw new ErrorSeguimiento("No eres el gerente de esta gerencia.");
  }
  if (objetivo.periodo.estado !== "ABIERTO") {
    throw new ErrorSeguimiento("El periodo no está abierto para registrar seguimiento.");
  }

  const seguimiento = await exigirSeguimientoEnCurso(objetivo.periodoId);

  return crearSiguienteVersionRegistro(
    objetivo.id,
    seguimiento.id,
    input.gerenteId,
    input.comentario,
    input.porcentaje,
  );
}
