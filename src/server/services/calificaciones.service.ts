import { db } from "@/server/db";

// Calificación final de objetivos INDIVIDUALES (el jefe califica a sus
// colaboradores directos). Solo procede cuando el periodo ya pasó a
// EN_EVALUACION, lo que a su vez exige que todos los cortes estén cerrados
// (ver `pasarPeriodoAEvaluacion` en periodos.service.ts) — así se respeta
// "la calificación final se pone cuando se cumplan todos los cortes".
export class ErrorCalificacion extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErrorCalificacion";
  }
}

async function obtenerObjetivoIndividualParaCalificar(objetivoId: string, jefeId: string) {
  const objetivo = await db.objetivo.findUnique({
    where: { id: objetivoId },
    include: { periodo: true, usuario: true },
  });
  if (!objetivo || objetivo.nivel !== "INDIVIDUAL" || !objetivo.usuario) {
    throw new ErrorCalificacion("El objetivo no existe.");
  }
  if (objetivo.usuario.jefeId !== jefeId) {
    throw new ErrorCalificacion("No eres el jefe directo de este colaborador.");
  }
  if (objetivo.estadoAprobacion !== "APROBADO") {
    throw new ErrorCalificacion("Solo se pueden calificar objetivos aprobados.");
  }
  if (objetivo.periodo.estado !== "EN_EVALUACION") {
    throw new ErrorCalificacion(
      "La calificación final solo se registra cuando el periodo pasa a evaluación (todos los cortes cerrados).",
    );
  }
  return objetivo;
}

export async function calificarObjetivoDesempeno(input: {
  objetivoId: string;
  calificacionFinal: number;
  jefeId: string;
}) {
  const objetivo = await obtenerObjetivoIndividualParaCalificar(input.objetivoId, input.jefeId);
  if (objetivo.tipoIndividual !== "DESEMPENO") {
    throw new ErrorCalificacion("Este objetivo no es de desempeño.");
  }

  return db.objetivo.update({
    where: { id: input.objetivoId },
    data: {
      calificacionFinal: input.calificacionFinal,
      calificadoPor: input.jefeId,
      fechaCalificacion: new Date(),
    },
  });
}

export async function calificarObjetivoDesarrollo(input: {
  objetivoId: string;
  cumplioDesarrollo: boolean;
  jefeId: string;
}) {
  const objetivo = await obtenerObjetivoIndividualParaCalificar(input.objetivoId, input.jefeId);
  if (objetivo.tipoIndividual !== "DESARROLLO") {
    throw new ErrorCalificacion("Este objetivo no es de desarrollo.");
  }

  return db.objetivo.update({
    where: { id: input.objetivoId },
    data: {
      cumplioDesarrollo: input.cumplioDesarrollo,
      calificadoPor: input.jefeId,
      fechaCalificacion: new Date(),
    },
  });
}

// Calificación final de objetivos GERENCIA — la pone el gerente dueño de esa
// gerencia sobre sus propios 2 objetivos. A diferencia de INDIVIDUAL, estos
// objetivos siempre nacen APROBADO (no pasan por flujo de aprobación, ver
// gerencia.service.ts), así que no hace falta ese chequeo aquí.
export async function calificarObjetivoGerencia(input: {
  objetivoId: string;
  calificacionFinal: number;
  gerenteId: string;
}) {
  const objetivo = await db.objetivo.findUnique({
    where: { id: input.objetivoId },
    include: { periodo: true, gerencia: true },
  });
  if (!objetivo || objetivo.nivel !== "GERENCIA" || !objetivo.gerencia) {
    throw new ErrorCalificacion("El objetivo no existe.");
  }
  if (objetivo.gerencia.gerenteId !== input.gerenteId) {
    throw new ErrorCalificacion("No eres el gerente de esta gerencia.");
  }
  if (objetivo.periodo.estado !== "EN_EVALUACION") {
    throw new ErrorCalificacion(
      "La calificación final solo se registra cuando el periodo pasa a evaluación (todos los cortes cerrados).",
    );
  }

  return db.objetivo.update({
    where: { id: input.objetivoId },
    data: {
      calificacionFinal: input.calificacionFinal,
      calificadoPor: input.gerenteId,
      fechaCalificacion: new Date(),
    },
  });
}

// Calificación final de objetivos CORPORATIVO — la pone Gestión Humana/Admin.
// No hay un "dueño" individual como en jefe/gerente: el control de acceso es
// puramente por rol (ver requireRol en administracion/actions.ts).
export async function calificarObjetivoCorporativo(input: {
  objetivoId: string;
  calificacionFinal: number;
  adminId: string;
}) {
  const objetivo = await db.objetivo.findUnique({
    where: { id: input.objetivoId },
    include: { periodo: true },
  });
  if (!objetivo || objetivo.nivel !== "CORPORATIVO") {
    throw new ErrorCalificacion("El objetivo no existe.");
  }
  if (objetivo.periodo.estado !== "EN_EVALUACION") {
    throw new ErrorCalificacion(
      "La calificación final solo se registra cuando el periodo pasa a evaluación (todos los cortes cerrados).",
    );
  }

  return db.objetivo.update({
    where: { id: input.objetivoId },
    data: {
      calificacionFinal: input.calificacionFinal,
      calificadoPor: input.adminId,
      fechaCalificacion: new Date(),
    },
  });
}
