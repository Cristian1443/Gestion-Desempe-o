import { db } from "@/server/db";
import { CANTIDAD_OBJETIVOS_GERENCIA } from "@/server/services/calculo-notas";
import { ErrorCalificacion, exigirFranjaCumplimiento } from "@/server/services/calificaciones.service";
import {
  obtenerContextoFranjas,
  obtenerPeriodoActual,
  type ContextoFranjas,
} from "@/server/services/periodos.service";

// Indicadores de la gerencia = objetivos de nivel GERENCIA. Hacen lo mismo que
// los de la empresa (sin peso, % de avance con comentario y resultado final
// Cumple / No cumple), pero el seguimiento no es mensual sino por los
// seguimientos con franja que define Gestión Humana. Los carga y les hace
// seguimiento el gerente de la gerencia; son 2 por gerencia. No pasan por
// aprobación: quedan vigentes de una vez.
export class ErrorGerencia extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErrorGerencia";
  }
}

export interface DatosIndicadorGerencia {
  titulo: string;
  descripcion: string;
  meta: string;
  // Cómo se mide el indicador (la fórmula o el criterio).
  indicador: string;
  unidadMedida: string;
}

async function gerenciaDelGerenteOFalla(gerenteId: string) {
  const gerencia = await db.gerencia.findFirst({ where: { gerenteId } });
  if (!gerencia) throw new ErrorGerencia("No eres el gerente de ninguna gerencia.");
  return gerencia;
}

async function indicadorDelGerenteOFalla(objetivoId: string, gerenteId: string) {
  const objetivo = await db.objetivo.findUnique({
    where: { id: objetivoId },
    include: { periodo: true, gerencia: true, _count: { select: { seguimientos: true } } },
  });
  if (!objetivo || objetivo.nivel !== "GERENCIA" || !objetivo.gerencia) {
    throw new ErrorGerencia("El indicador no existe.");
  }
  if (objetivo.gerencia.gerenteId !== gerenteId) {
    throw new ErrorGerencia("No eres el gerente de esta gerencia.");
  }
  if (objetivo.periodo.estado !== "ABIERTO") {
    throw new ErrorGerencia("El periodo no está abierto.");
  }
  return objetivo;
}

// Se cargan de a uno, hasta 2 por gerencia.
export async function crearIndicadorGerencia(gerenteId: string, datos: DatosIndicadorGerencia) {
  const gerencia = await gerenciaDelGerenteOFalla(gerenteId);

  const periodo = await obtenerPeriodoActual();
  if (!periodo) throw new ErrorGerencia("No hay un periodo abierto.");

  const cargados = await db.objetivo.count({
    where: { periodoId: periodo.id, nivel: "GERENCIA", gerenciaId: gerencia.id },
  });
  if (cargados >= CANTIDAD_OBJETIVOS_GERENCIA) {
    throw new ErrorGerencia(`Ya están los ${CANTIDAD_OBJETIVOS_GERENCIA} indicadores de la gerencia.`);
  }

  return db.objetivo.create({
    data: {
      periodoId: periodo.id,
      nivel: "GERENCIA",
      gerenciaId: gerencia.id,
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      meta: datos.meta,
      indicador: datos.indicador,
      unidadMedida: datos.unidadMedida,
      peso: 0,
      estadoAprobacion: "APROBADO",
      creadoPor: gerenteId,
      aprobadoPor: gerenteId,
      fechaAprobacion: new Date(),
    },
  });
}

export async function editarIndicadorGerencia(
  gerenteId: string,
  objetivoId: string,
  datos: DatosIndicadorGerencia,
) {
  await indicadorDelGerenteOFalla(objetivoId, gerenteId);

  return db.objetivo.update({
    where: { id: objetivoId },
    data: {
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      meta: datos.meta,
      indicador: datos.indicador,
      unidadMedida: datos.unidadMedida,
    },
  });
}

// Solo se elimina un indicador que todavía no tiene seguimientos ni resultado:
// borrarlo con historial perdería esos registros en silencio.
export async function eliminarIndicadorGerencia(gerenteId: string, objetivoId: string) {
  const objetivo = await indicadorDelGerenteOFalla(objetivoId, gerenteId);
  if (objetivo._count.seguimientos > 0 || objetivo.cumplido !== null) {
    throw new ErrorGerencia("No se puede eliminar un indicador que ya tiene seguimientos o resultado.");
  }
  await db.objetivo.delete({ where: { id: objetivoId } });
}

// Resultado final del indicador: lo marca el gerente dentro de la franja del %
// de cumplimiento que Gestión Humana define para el periodo.
export async function marcarCumplimientoGerencia(input: {
  objetivoId: string;
  cumple: boolean;
  gerenteId: string;
}) {
  const objetivo = await indicadorDelGerenteOFalla(input.objetivoId, input.gerenteId);

  try {
    exigirFranjaCumplimiento(objetivo.periodo);
  } catch (error) {
    if (error instanceof ErrorCalificacion) throw new ErrorGerencia(error.message);
    throw error;
  }

  return db.objetivo.update({
    where: { id: input.objetivoId },
    data: { cumplido: input.cumple, calificadoPor: input.gerenteId, fechaCalificacion: new Date() },
  });
}

// --- Vista ---

export interface SeguimientoGerenciaVista {
  numero: number;
  porcentaje: number | null;
  comentario: string;
  fecha: Date;
}

export type EstadoIndicadorGerencia = "CUMPLE" | "NO_CUMPLE" | "EN_SEGUIMIENTO";

export interface IndicadorGerenciaVista {
  id: string;
  titulo: string;
  descripcion: string;
  meta: string;
  indicador: string;
  unidadMedida: string | null;
  // Un registro vigente por seguimiento (el más reciente, si hubo
  // correcciones), ordenado por número de seguimiento ascendente.
  seguimientos: SeguimientoGerenciaVista[];
  ultimoPorcentaje: number | null;
  cumplido: boolean | null;
  estado: EstadoIndicadorGerencia;
}

export interface ColaboradorConsolidado {
  usuarioId: string;
  nombre: string;
  cargo: string | null;
  totalObjetivos: number;
  aprobados: number;
  pendientes: number;
  // Objetivos aprobados que ya tienen al menos un seguimiento registrado en
  // el seguimiento de referencia (el que está en curso o el último iniciado).
  conSeguimientoDeReferencia: number;
}

export interface MiGerencia {
  periodo: { id: string; nombre: string; estado: string };
  franjas: ContextoFranjas;
  gerencia: { id: string; nombre: string };
  // Siempre deben ser `tope` (2); `indicadores.length` dice cuántos van.
  tope: number;
  indicadores: IndicadorGerenciaVista[];
  colaboradores: ColaboradorConsolidado[];
}

export async function obtenerMiGerencia(gerenteId: string): Promise<MiGerencia | null> {
  const gerencia = await db.gerencia.findFirst({ where: { gerenteId } });
  if (!gerencia) return null;

  const periodo = await obtenerPeriodoActual();
  if (!periodo) return null;

  const franjas = await obtenerContextoFranjas(periodo.id);
  const seguimientoReferenciaId = franjas.seguimientoReferencia?.id;

  const objetivosGerencia = await db.objetivo.findMany({
    where: { periodoId: periodo.id, nivel: "GERENCIA", gerenciaId: gerencia.id },
    include: {
      seguimientos: {
        orderBy: [{ seguimientoId: "asc" }, { version: "desc" }],
        distinct: ["seguimientoId"],
        include: { seguimiento: { select: { numero: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const indicadores: IndicadorGerenciaVista[] = objetivosGerencia.map((o) => {
    const seguimientos = o.seguimientos
      .map((s) => ({
        numero: s.seguimiento.numero,
        porcentaje: s.porcentaje,
        comentario: s.comentario,
        fecha: s.createdAt,
      }))
      .sort((a, b) => a.numero - b.numero);

    return {
      id: o.id,
      titulo: o.titulo,
      descripcion: o.descripcion,
      // Los indicadores de gerencia siempre traen `meta` (la exige su propio
      // formulario de creación) — solo INDIVIDUAL puede dejarla nula.
      meta: o.meta as string,
      indicador: o.indicador,
      unidadMedida: o.unidadMedida,
      seguimientos,
      // Registros anteriores a este modelo no tienen %: se ignoran para el último.
      ultimoPorcentaje: [...seguimientos].reverse().find((s) => s.porcentaje !== null)?.porcentaje ?? null,
      cumplido: o.cumplido,
      estado: o.cumplido === null ? "EN_SEGUIMIENTO" : o.cumplido ? "CUMPLE" : "NO_CUMPLE",
    };
  });

  const colaboradoresBase = await db.usuario.findMany({
    where: { gerenciaId: gerencia.id, activo: true, id: { not: gerenteId } },
    select: { id: true, nombre: true, cargo: true },
    orderBy: { nombre: "asc" },
  });

  const colaboradores: ColaboradorConsolidado[] = await Promise.all(
    colaboradoresBase.map(async (colaborador) => {
      const objetivosIndividuales = await db.objetivo.findMany({
        where: { periodoId: periodo.id, nivel: "INDIVIDUAL", usuarioId: colaborador.id },
        include: {
          seguimientos: seguimientoReferenciaId
            ? { where: { seguimientoId: seguimientoReferenciaId }, take: 1 }
            : { take: 0 },
        },
      });

      const aprobados = objetivosIndividuales.filter((o) => o.estadoAprobacion === "APROBADO");
      const pendientes = objetivosIndividuales.filter(
        (o) => o.estadoAprobacion === "PENDIENTE_APROBACION",
      );
      const conSeguimientoDeReferencia = aprobados.filter((o) => o.seguimientos.length > 0).length;

      return {
        usuarioId: colaborador.id,
        nombre: colaborador.nombre,
        cargo: colaborador.cargo,
        totalObjetivos: objetivosIndividuales.length,
        aprobados: aprobados.length,
        pendientes: pendientes.length,
        conSeguimientoDeReferencia,
      };
    }),
  );

  return {
    periodo: { id: periodo.id, nombre: periodo.nombre, estado: periodo.estado },
    franjas,
    gerencia: { id: gerencia.id, nombre: gerencia.nombre },
    tope: CANTIDAD_OBJETIVOS_GERENCIA,
    indicadores,
    colaboradores,
  };
}
