import { db } from "@/server/db";
import { CANTIDAD_DESARROLLO_ACTIVA, FILTRO_OBJETIVOS_ACTIVOS, PESO_TOTAL_INDIVIDUALES } from "@/lib/objetivos-config";
import { CANTIDAD_OBJETIVOS_DESEMPENO } from "@/server/services/calculo-notas";
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
      meta: string;
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

// El conjunto de objetivos individuales: 4 de desempeño (con peso, que entre los
// cuatro suma 100 %, y se miden con Cumple / No cumple) y, cuando se vuelvan a
// manejar, los de desarrollo.
function validarConjunto(objetivos: Array<{ tipo: "DESEMPENO" | "DESARROLLO"; peso: number }>) {
  const desempeno = objetivos.filter((o) => o.tipo === "DESEMPENO").length;
  const desarrollo = objetivos.filter((o) => o.tipo === "DESARROLLO").length;
  if (desempeno !== CANTIDAD_OBJETIVOS_DESEMPENO) {
    throw new ErrorAprobacion(
      `Se requieren exactamente ${CANTIDAD_OBJETIVOS_DESEMPENO} objetivos de desempeño, se recibieron ${desempeno}.`,
    );
  }
  if (desarrollo !== CANTIDAD_DESARROLLO_ACTIVA) {
    throw new ErrorAprobacion(
      CANTIDAD_DESARROLLO_ACTIVA === 0
        ? "Los objetivos de desarrollo no se manejan este año."
        : `Se requieren exactamente ${CANTIDAD_DESARROLLO_ACTIVA} objetivos de desarrollo, se recibieron ${desarrollo}.`,
    );
  }
  const suma = objetivos
    .filter((o) => o.tipo === "DESEMPENO")
    .reduce((acc, o) => acc + Math.round(o.peso * 100), 0);
  if (suma !== Math.round(PESO_TOTAL_INDIVIDUALES * 100)) {
    throw new ErrorAprobacion(
      `La suma de los pesos de los objetivos de desempeño debe ser ${PESO_TOTAL_INDIVIDUALES} %, es ${suma / 100} %.`,
    );
  }
}

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

  validarConjunto(objetivos.map((o) => ({ tipo: o.tipoIndividual, peso: o.tipoIndividual === "DESEMPENO" ? o.peso : 0 })));

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
        meta: o.tipoIndividual === "DESEMPENO" ? o.meta : null,
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
    where: { periodoId, nivel: "INDIVIDUAL", usuarioId, estadoAprobacion: "PENDIENTE_APROBACION", ...FILTRO_OBJETIVOS_ACTIVOS },
  });
  if (pendientes.length === 0) {
    throw new ErrorAprobacion("Este colaborador no tiene objetivos pendientes de aprobación.");
  }

  // Defensivo: re-valida las mismas reglas de negocio antes de aprobar, en
  // vez de asumir que seguían siendo válidas desde que se propusieron.
  validarConjunto(
    pendientes.map((o) => ({ tipo: o.tipoIndividual as "DESEMPENO" | "DESARROLLO", peso: o.peso.toNumber() })),
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
    where: { periodoId, nivel: "INDIVIDUAL", usuarioId, estadoAprobacion: "PENDIENTE_APROBACION", ...FILTRO_OBJETIVOS_ACTIVOS },
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
