import { db } from "@/server/db";
import { validarObjetivosIndividuales } from "@/server/services/calculo-notas";
import { obtenerPeriodoActual } from "@/server/services/periodos.service";

export class ErrorAprobacion extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErrorAprobacion";
  }
}

export type ObjetivoPropuesto =
  | {
      tipoIndividual: "DESEMPENO";
      descripcion: string;
      acciones: string;
      indicador: string;
      peso: number;
      lineaEstrategica: "L1" | "L2" | "L3" | "L4" | "L5";
      linkRepositorio?: string;
    }
  | {
      tipoIndividual: "DESARROLLO";
      descripcion: string;
      acciones: string;
      indicador: string;
      competencia: string;
      linkRepositorio?: string;
    };

const LARGO_TITULO = 100;

// No hay un campo de "título" en el formulario (la herramienta anterior lo
// autogeneraba sin valor real, ej. "Obj 6 - Nombre Persona") — se deriva de
// la descripción para tener un encabezado corto en tarjetas y listas.
function derivarTitulo(descripcion: string): string {
  const texto = descripcion.trim();
  return texto.length > LARGO_TITULO ? `${texto.slice(0, LARGO_TITULO - 1)}…` : texto;
}

// El colaborador propone su conjunto completo de objetivos individuales en
// un solo envío (no hay una etapa de borrador separada en esta primera
// versión). Solo se permite si todavía no tiene objetivos individuales
// vigentes (pendientes o aprobados) para el periodo — si el jefe devolvió el
// conjunto anterior, esto lo reemplaza por completo en vez de mezclarlo con
// lo ya devuelto, porque los pesos deben volver a sumar 100 como conjunto.
export async function proponerObjetivosIndividuales(
  usuarioId: string,
  objetivos: ObjetivoPropuesto[],
) {
  const periodo = await obtenerPeriodoActual();
  if (!periodo) {
    throw new ErrorAprobacion("No hay un periodo abierto para proponer objetivos.");
  }
  if (periodo.estado !== "ABIERTO") {
    throw new ErrorAprobacion("El periodo no está abierto para proponer objetivos.");
  }

  validarObjetivosIndividuales(
    objetivos.map((o, i) => ({
      id: String(i),
      peso: o.tipoIndividual === "DESEMPENO" ? o.peso : 0,
      calificacionFinal: null,
      tipoIndividual: o.tipoIndividual,
    })),
  );

  const existentes = await db.objetivo.findMany({
    where: { periodoId: periodo.id, nivel: "INDIVIDUAL", usuarioId },
  });

  const vigentes = existentes.filter((o) => o.estadoAprobacion !== "DEVUELTO");
  if (vigentes.length > 0) {
    throw new ErrorAprobacion(
      "Ya tienes objetivos individuales pendientes de aprobación o aprobados para este periodo.",
    );
  }

  await db.$transaction([
    db.objetivo.deleteMany({
      where: { id: { in: existentes.map((o) => o.id) } },
    }),
    db.objetivo.createMany({
      data: objetivos.map((o) => ({
        periodoId: periodo.id,
        nivel: "INDIVIDUAL" as const,
        usuarioId,
        titulo: derivarTitulo(o.descripcion),
        descripcion: o.descripcion,
        acciones: o.acciones,
        indicador: o.indicador,
        peso: o.tipoIndividual === "DESEMPENO" ? o.peso : 0,
        tipoIndividual: o.tipoIndividual,
        lineaEstrategica: o.tipoIndividual === "DESEMPENO" ? o.lineaEstrategica : null,
        competencia: o.tipoIndividual === "DESARROLLO" ? o.competencia : null,
        linkRepositorio: o.linkRepositorio ?? null,
        estadoAprobacion: "PENDIENTE_APROBACION" as const,
        creadoPor: usuarioId,
      })),
    }),
  ]);
}

async function verificarJefeDirecto(usuarioId: string, jefeId: string) {
  const colaborador = await db.usuario.findUnique({ where: { id: usuarioId } });
  if (!colaborador || colaborador.jefeId !== jefeId) {
    throw new ErrorAprobacion("No eres el jefe directo de este colaborador.");
  }
}

export async function aprobarObjetivosIndividuales(
  usuarioId: string,
  periodoId: string,
  jefeId: string,
) {
  await verificarJefeDirecto(usuarioId, jefeId);

  const pendientes = await db.objetivo.findMany({
    where: { periodoId, nivel: "INDIVIDUAL", usuarioId, estadoAprobacion: "PENDIENTE_APROBACION" },
  });
  if (pendientes.length === 0) {
    throw new ErrorAprobacion("Este colaborador no tiene objetivos pendientes de aprobación.");
  }

  // Defensivo: re-valida las mismas reglas de negocio antes de aprobar, en
  // vez de asumir que seguían siendo válidas desde que se propusieron.
  validarObjetivosIndividuales(
    pendientes.map((o) => ({
      id: o.id,
      peso: o.peso.toNumber(),
      calificacionFinal: null,
      tipoIndividual: o.tipoIndividual as "DESEMPENO" | "DESARROLLO",
    })),
  );

  await db.objetivo.updateMany({
    where: { id: { in: pendientes.map((o) => o.id) } },
    data: {
      estadoAprobacion: "APROBADO",
      aprobadoPor: jefeId,
      fechaAprobacion: new Date(),
      comentarioAprobacion: null,
    },
  });
}

export async function devolverObjetivosIndividuales(
  usuarioId: string,
  periodoId: string,
  jefeId: string,
  comentario: string,
) {
  await verificarJefeDirecto(usuarioId, jefeId);

  const resultado = await db.objetivo.updateMany({
    where: { periodoId, nivel: "INDIVIDUAL", usuarioId, estadoAprobacion: "PENDIENTE_APROBACION" },
    data: {
      estadoAprobacion: "DEVUELTO",
      comentarioAprobacion: comentario,
      aprobadoPor: jefeId,
      fechaAprobacion: new Date(),
    },
  });

  if (resultado.count === 0) {
    throw new ErrorAprobacion("Este colaborador no tiene objetivos pendientes de aprobación.");
  }
}
