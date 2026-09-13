import { db } from "@/server/db";
import { obtenerCorteActual } from "@/server/services/periodos.service";
import type {
  ReportarAvanceCorporativoInput,
  ReportarAvanceInput,
} from "@/server/validations/seguimiento.schema";

export class ErrorSeguimiento extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErrorSeguimiento";
  }
}

// Núcleo compartido: crea la siguiente versión del seguimiento (comentario +
// fecha) de un (objetivo, corte), sin importar el nivel del objetivo. Nunca
// actualiza una fila existente — quien le hace seguimiento puede corregir su
// propio comentario del corte creando una versión nueva, que queda como la
// vigente; el historial completo se conserva.
async function crearSiguienteVersionSeguimiento(
  objetivoId: string,
  corteId: string,
  registradoPor: string,
  comentario: string,
  porcentajeAvance?: number,
) {
  const ultimo = await db.seguimiento.findFirst({
    where: { objetivoId, corteId },
    orderBy: { version: "desc" },
  });

  return db.seguimiento.create({
    data: {
      objetivoId,
      corteId,
      version: ultimo ? ultimo.version + 1 : 1,
      comentario,
      porcentajeAvance,
      registradoPor,
    },
  });
}

// Seguimiento de un objetivo INDIVIDUAL, registrado directamente por el jefe
// directo del dueño del objetivo (no es un autorreporte del colaborador: el
// jefe hace el seguimiento a su equipo durante el periodo y, con base en
// esos seguimientos, asigna la calificación final al cierre, una vez existan
// los seguimientos de todos los cortes que definió el administrador).
export async function registrarSeguimientoIndividual(
  input: ReportarAvanceInput & { jefeId: string },
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

  const corteActual = await obtenerCorteActual(objetivo.periodoId);
  if (!corteActual) {
    throw new ErrorSeguimiento("No hay cortes de seguimiento configurados para este periodo.");
  }

  return crearSiguienteVersionSeguimiento(objetivo.id, corteActual.id, input.jefeId, input.comentario);
}

// Seguimiento de un objetivo de GERENCIA, hecho por el gerente del área (no
// hay un dueño individual: el objetivo aplica a toda la gerencia).
export async function reportarAvanceGerencia(input: ReportarAvanceInput & { gerenteId: string }) {
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

  const corteActual = await obtenerCorteActual(objetivo.periodoId);
  if (!corteActual) {
    throw new ErrorSeguimiento("No hay cortes de seguimiento configurados para este periodo.");
  }

  return crearSiguienteVersionSeguimiento(objetivo.id, corteActual.id, input.gerenteId, input.comentario);
}

// Seguimiento de un objetivo CORPORATIVO. No tiene un dueño individual ni de
// gerencia — la autorización (Gestión Humana/Admin o el rol acotado
// GESTOR_CORPORATIVO) se resuelve en la capa de Server Action con
// `requireRol`, no aquí. A diferencia de INDIVIDUAL/GERENCIA, sí lleva un
// porcentaje de avance (0-100) visible para toda la organización.
export async function reportarAvanceCorporativo(
  input: ReportarAvanceCorporativoInput & { registradoPor: string },
) {
  const objetivo = await db.objetivo.findUnique({
    where: { id: input.objetivoId },
    include: { periodo: true },
  });

  if (!objetivo) {
    throw new ErrorSeguimiento("El objetivo no existe.");
  }
  if (objetivo.nivel !== "CORPORATIVO") {
    throw new ErrorSeguimiento("Este objetivo no es corporativo.");
  }
  if (objetivo.periodo.estado !== "ABIERTO") {
    throw new ErrorSeguimiento("El periodo no está abierto para registrar seguimiento.");
  }

  const corteActual = await obtenerCorteActual(objetivo.periodoId);
  if (!corteActual) {
    throw new ErrorSeguimiento("No hay cortes de seguimiento configurados para este periodo.");
  }

  return crearSiguienteVersionSeguimiento(
    objetivo.id,
    corteActual.id,
    input.registradoPor,
    input.comentario,
    input.porcentajeAvance,
  );
}
