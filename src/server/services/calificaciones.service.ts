import { db } from "@/server/db";
import { formatearFecha } from "@/lib/fecha";
import { estadoFranja, hoyEnBogota } from "@/lib/franja";

// Calificación final (en pantalla: "resultado final") de los objetivos. Solo
// se puede poner dentro de la franja que Gestión Humana define para el periodo;
// nadie abre ni cierra nada a mano. Individuales: la pone el jefe directo.
export class ErrorCalificacion extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErrorCalificacion";
  }
}

export function exigirFranjaCumplimiento(periodo: {
  estado: string;
  cumplimientoInicio: Date | null;
  cumplimientoFin: Date | null;
}) {
  if (periodo.estado !== "ABIERTO") {
    throw new ErrorCalificacion("El periodo no está abierto.");
  }
  const { cumplimientoInicio: inicio, cumplimientoFin: fin } = periodo;
  if (!inicio || !fin) {
    throw new ErrorCalificacion("Gestión Humana todavía no definió la franja del resultado final.");
  }

  const estado = estadoFranja(inicio, fin, hoyEnBogota());
  if (estado === "PROXIMA") {
    throw new ErrorCalificacion(
      `El resultado final se marca del ${formatearFecha(inicio)} al ${formatearFecha(fin)}. Todavía no empieza.`,
    );
  }
  if (estado === "FINALIZADA") {
    throw new ErrorCalificacion(`La franja del resultado final terminó el ${formatearFecha(fin)}.`);
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
  exigirFranjaCumplimiento(objetivo.periodo);
  return objetivo;
}

// Resultado final de un objetivo de desempeño: Cumple / No cumple, sin peso.
export async function calificarObjetivoDesempeno(input: {
  objetivoId: string;
  cumple: boolean;
  jefeId: string;
}) {
  const objetivo = await obtenerObjetivoIndividualParaCalificar(input.objetivoId, input.jefeId);
  if (objetivo.tipoIndividual !== "DESEMPENO") {
    throw new ErrorCalificacion("Este objetivo no es de desempeño.");
  }

  return db.objetivo.update({
    where: { id: input.objetivoId },
    data: {
      cumplido: input.cumple,
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
