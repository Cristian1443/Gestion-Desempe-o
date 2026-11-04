import { formatearFecha } from "@/lib/fecha";
import { db } from "@/server/db";
import { obtenerContextoFranjas, type ContextoFranjas } from "@/server/services/periodos.service";

export class ErrorEvidencia extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErrorEvidencia";
  }
}

// "Evidencias realizadas": lo que el colaborador cuenta que hizo, un texto por objetivo
// individual y por seguimiento. Solo se escribe ANTES de cada seguimiento, para que el
// jefe lo tenga a la mano cuando lo haga: la ventana está abierta desde que termina el
// seguimiento anterior (o desde el inicio del periodo) hasta que empieza el siguiente.
// Mientras un seguimiento está en curso, o cuando ya no quedan más, está cerrada.
export type VentanaEvidencia =
  | { abierta: true; seguimiento: { id: string; numero: number; fechaInicio: Date; fechaFin: Date } }
  | { abierta: false; motivo: string };

export function ventanaEvidencia(
  franjas: Pick<ContextoFranjas, "seguimientoEnCurso" | "proximoSeguimiento">,
): VentanaEvidencia {
  const { seguimientoEnCurso, proximoSeguimiento } = franjas;

  if (seguimientoEnCurso) {
    return {
      abierta: false,
      motivo: `El seguimiento ${seguimientoEnCurso.numero} está en curso: las evidencias se registran antes de cada seguimiento.`,
    };
  }
  if (!proximoSeguimiento) {
    return { abierta: false, motivo: "No quedan seguimientos programados en este periodo." };
  }
  return { abierta: true, seguimiento: proximoSeguimiento };
}

export function textoVentanaCerrada(ventana: Extract<VentanaEvidencia, { abierta: false }>): string {
  return ventana.motivo;
}

export function textoVentanaAbierta(ventana: Extract<VentanaEvidencia, { abierta: true }>): string {
  const { numero, fechaInicio, fechaFin } = ventana.seguimiento;
  return `Cuéntanos qué hiciste antes del seguimiento ${numero} (del ${formatearFecha(fechaInicio)} al ${formatearFecha(fechaFin)}).`;
}

// Guarda (o corrige) las evidencias de un objetivo propio para el próximo seguimiento.
export async function guardarEvidencia(input: { usuarioId: string; objetivoId: string; texto: string }) {
  const objetivo = await db.objetivo.findUnique({
    where: { id: input.objetivoId },
    include: { periodo: true },
  });

  if (!objetivo || objetivo.nivel !== "INDIVIDUAL") throw new ErrorEvidencia("El objetivo no existe.");
  if (objetivo.usuarioId !== input.usuarioId) throw new ErrorEvidencia("Solo puedes registrar evidencias de tus propios objetivos.");
  if (objetivo.tipoIndividual !== "DESEMPENO") throw new ErrorEvidencia("Las evidencias solo aplican a los objetivos de desempeño.");
  if (objetivo.estadoAprobacion !== "APROBADO") {
    throw new ErrorEvidencia("Podrás registrar evidencias cuando tu jefe apruebe el objetivo.");
  }
  if (objetivo.periodo.estado !== "ABIERTO") throw new ErrorEvidencia("El periodo no está abierto.");

  const ventana = ventanaEvidencia(await obtenerContextoFranjas(objetivo.periodoId));
  if (!ventana.abierta) throw new ErrorEvidencia(ventana.motivo);

  return db.evidenciaObjetivo.upsert({
    where: { objetivoId_seguimientoId: { objetivoId: objetivo.id, seguimientoId: ventana.seguimiento.id } },
    create: {
      objetivoId: objetivo.id,
      seguimientoId: ventana.seguimiento.id,
      texto: input.texto,
      registradoPor: input.usuarioId,
    },
    update: { texto: input.texto, registradoPor: input.usuarioId },
  });
}
