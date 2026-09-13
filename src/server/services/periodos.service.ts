import { db } from "@/server/db";

// El periodo "actual" para efectos de reporte de avance es el que está
// ABIERTO o EN_EVALUACION. Solo debería haber uno a la vez en la práctica,
// pero si hubiera más de uno (transición entre periodos), se toma el más
// reciente por fecha de inicio.
export async function obtenerPeriodoActual() {
  return db.periodo.findFirst({
    where: { estado: { in: ["ABIERTO", "EN_EVALUACION"] } },
    orderBy: { fechaInicio: "desc" },
  });
}

// El corte "vigente" para registrar seguimiento es el que el administrador
// dejó ABIERTO — nunca se infiere de la fecha límite (esa es solo una
// referencia de cuándo debería cerrarse). Si el administrador no ha abierto
// ningún corte todavía, no hay corte vigente y nadie puede registrar
// seguimiento hasta que lo abra.
export async function obtenerCorteActual(periodoId: string) {
  return db.corte.findFirst({
    where: { periodoId, estado: "ABIERTO" },
    orderBy: { numero: "desc" },
  });
}

// --- Administración de periodos (Gestión Humana / Admin) ---

export class ErrorPeriodo extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErrorPeriodo";
  }
}

export async function listarPeriodos() {
  return db.periodo.findMany({
    include: { cortes: { orderBy: { numero: "asc" } } },
    orderBy: { fechaInicio: "desc" },
  });
}

export async function crearPeriodo(input: { nombre: string; fechaInicio: Date; fechaFin: Date }) {
  if (input.fechaFin <= input.fechaInicio) {
    throw new ErrorPeriodo("La fecha de fin debe ser posterior a la fecha de inicio.");
  }

  const existente = await db.periodo.findUnique({ where: { nombre: input.nombre } });
  if (existente) {
    throw new ErrorPeriodo(`Ya existe un periodo llamado "${input.nombre}".`);
  }

  return db.periodo.create({
    data: { nombre: input.nombre, fechaInicio: input.fechaInicio, fechaFin: input.fechaFin },
  });
}

// Los cortes se pueden agregar en cualquier momento mientras el periodo no
// esté cerrado — como el corte no se activa solo (el administrador lo abre
// cuando decide), agregar uno nuevo a un periodo ya abierto no genera
// ninguna inconsistencia: simplemente queda en borrador hasta que se abra.
export async function agregarCorte(input: { periodoId: string; nombre: string; fechaLimite: Date }) {
  const periodo = await db.periodo.findUnique({
    where: { id: input.periodoId },
    include: { cortes: { orderBy: { numero: "desc" }, take: 1 } },
  });
  if (!periodo) {
    throw new ErrorPeriodo("El periodo no existe.");
  }
  if (periodo.estado === "CERRADO") {
    throw new ErrorPeriodo("No se pueden agregar cortes a un periodo cerrado.");
  }
  if (input.fechaLimite < periodo.fechaInicio || input.fechaLimite > periodo.fechaFin) {
    throw new ErrorPeriodo("La fecha límite del corte debe estar dentro del rango del periodo.");
  }

  const ultimoCorte = periodo.cortes[0];

  return db.corte.create({
    data: {
      periodoId: input.periodoId,
      numero: ultimoCorte ? ultimoCorte.numero + 1 : 1,
      nombre: input.nombre,
      fechaLimite: input.fechaLimite,
    },
  });
}

export async function editarCorte(input: { corteId: string; nombre: string; fechaLimite: Date }) {
  const corte = await db.corte.findUnique({
    where: { id: input.corteId },
    include: { periodo: true },
  });
  if (!corte) {
    throw new ErrorPeriodo("El corte no existe.");
  }
  if (input.fechaLimite < corte.periodo.fechaInicio || input.fechaLimite > corte.periodo.fechaFin) {
    throw new ErrorPeriodo("La fecha límite del corte debe estar dentro del rango del periodo.");
  }

  return db.corte.update({
    where: { id: input.corteId },
    data: { nombre: input.nombre, fechaLimite: input.fechaLimite },
  });
}

// Solo se puede eliminar un corte que todavía no tiene ningún seguimiento
// registrado — borrarlo con historial real adentro perdería ese registro
// silenciosamente.
export async function eliminarCorte(corteId: string) {
  const corte = await db.corte.findUnique({
    where: { id: corteId },
    include: { _count: { select: { seguimientos: true } } },
  });
  if (!corte) {
    throw new ErrorPeriodo("El corte no existe.");
  }
  if (corte._count.seguimientos > 0) {
    throw new ErrorPeriodo(
      "No se puede eliminar un corte que ya tiene seguimientos registrados.",
    );
  }

  await db.corte.delete({ where: { id: corteId } });
}

export async function abrirPeriodo(periodoId: string) {
  const periodo = await db.periodo.findUnique({
    where: { id: periodoId },
    include: { _count: { select: { cortes: true } } },
  });
  if (!periodo) {
    throw new ErrorPeriodo("El periodo no existe.");
  }
  if (periodo.estado !== "BORRADOR") {
    throw new ErrorPeriodo("Solo se puede abrir un periodo que esté en borrador.");
  }
  if (periodo._count.cortes === 0) {
    throw new ErrorPeriodo("Define al menos un corte de seguimiento antes de abrir el periodo.");
  }

  const otroActivo = await db.periodo.findFirst({
    where: { id: { not: periodoId }, estado: { in: ["ABIERTO", "EN_EVALUACION"] } },
  });
  if (otroActivo) {
    throw new ErrorPeriodo(
      `Ya hay un periodo activo ("${otroActivo.nombre}"). Ciérralo antes de abrir uno nuevo.`,
    );
  }

  return db.periodo.update({ where: { id: periodoId }, data: { estado: "ABIERTO" } });
}

// La calificación final (nota de desempeño, sí/no de desarrollo) solo tiene
// sentido una vez terminó todo el seguimiento del periodo — por eso este
// paso exige que todos los cortes ya estén cerrados, no solo que el
// administrador lo decida a criterio libre como con abrir/cerrar cortes.
export async function pasarPeriodoAEvaluacion(periodoId: string) {
  const periodo = await db.periodo.findUnique({
    where: { id: periodoId },
    include: { cortes: true },
  });
  if (!periodo) {
    throw new ErrorPeriodo("El periodo no existe.");
  }
  if (periodo.estado !== "ABIERTO") {
    throw new ErrorPeriodo("Solo se puede pasar a evaluación un periodo que esté abierto.");
  }
  if (periodo.cortes.length === 0) {
    throw new ErrorPeriodo("Define al menos un corte antes de pasar a evaluación.");
  }
  const sinCerrar = periodo.cortes.filter((c) => c.estado !== "CERRADO");
  if (sinCerrar.length > 0) {
    throw new ErrorPeriodo(
      `Todos los cortes deben estar cerrados antes de pasar a evaluación. Falta cerrar: ${sinCerrar
        .map((c) => c.nombre)
        .join(", ")}.`,
    );
  }

  return db.periodo.update({ where: { id: periodoId }, data: { estado: "EN_EVALUACION" } });
}

// Igual que "todos los cortes cerrados" es requisito para pasar a
// EN_EVALUACION, "todos los objetivos calificados" es requisito para cerrar
// el periodo — de lo contrario se cerraría con evaluaciones a medias. Un
// objetivo DESARROLLO se considera calificado por `cumplioDesarrollo`
// (sí/no); el resto (DESEMPEÑO, GERENCIA, CORPORATIVO) por
// `calificacionFinal`.
export async function cerrarPeriodo(periodoId: string) {
  const periodo = await db.periodo.findUnique({ where: { id: periodoId } });
  if (!periodo) {
    throw new ErrorPeriodo("El periodo no existe.");
  }
  if (periodo.estado !== "EN_EVALUACION") {
    throw new ErrorPeriodo("Solo se puede cerrar un periodo que esté en evaluación.");
  }

  const objetivos = await db.objetivo.findMany({
    where: { periodoId },
    select: { nivel: true, tipoIndividual: true, calificacionFinal: true, cumplioDesarrollo: true },
  });
  const sinCalificar = objetivos.filter((o) =>
    o.tipoIndividual === "DESARROLLO" ? o.cumplioDesarrollo === null : o.calificacionFinal === null,
  );
  if (sinCalificar.length > 0) {
    const porNivel = sinCalificar.reduce<Record<string, number>>((acumulado, o) => {
      acumulado[o.nivel] = (acumulado[o.nivel] ?? 0) + 1;
      return acumulado;
    }, {});
    const detalle = Object.entries(porNivel)
      .map(([nivel, cantidad]) => `${cantidad} ${nivel}`)
      .join(", ");
    throw new ErrorPeriodo(
      `Todos los objetivos deben estar calificados antes de cerrar el periodo. Faltan: ${detalle}.`,
    );
  }

  return db.periodo.update({ where: { id: periodoId }, data: { estado: "CERRADO" } });
}

// --- Administración de cortes (Gestión Humana / Admin) ---

// Solo un corte ABIERTO a la vez por periodo (igual que con Periodo): tener
// dos "cortes vigentes" simultáneos no tendría sentido para quien registra
// seguimiento — no sabría contra cuál está reportando.
export async function abrirCorte(corteId: string) {
  const corte = await db.corte.findUnique({ where: { id: corteId } });
  if (!corte) {
    throw new ErrorPeriodo("El corte no existe.");
  }
  if (corte.estado !== "BORRADOR") {
    throw new ErrorPeriodo("Solo se puede abrir un corte que esté en borrador.");
  }

  const otroAbierto = await db.corte.findFirst({
    where: { periodoId: corte.periodoId, id: { not: corteId }, estado: "ABIERTO" },
  });
  if (otroAbierto) {
    throw new ErrorPeriodo(`Ya hay un corte abierto ("${otroAbierto.nombre}"). Ciérralo antes de abrir otro.`);
  }

  return db.corte.update({ where: { id: corteId }, data: { estado: "ABIERTO" } });
}

export async function cerrarCorte(corteId: string) {
  const corte = await db.corte.findUnique({ where: { id: corteId } });
  if (!corte) {
    throw new ErrorPeriodo("El corte no existe.");
  }
  if (corte.estado !== "ABIERTO") {
    throw new ErrorPeriodo("Solo se puede cerrar un corte que esté abierto.");
  }

  return db.corte.update({ where: { id: corteId }, data: { estado: "CERRADO" } });
}
