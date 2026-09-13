import type { EstadoAprobacionObjetivo } from "@prisma/client";
import { db } from "@/server/db";
import { obtenerCorteActual, obtenerPeriodoActual } from "@/server/services/periodos.service";

export interface SeguimientoVista {
  numeroCorte: number;
  comentario: string;
  fecha: Date;
  registradoPorNombre: string;
  // Solo lo llevan los objetivos CORPORATIVO — ver Seguimiento en el schema.
  porcentajeAvance: number | null;
}

export interface ObjetivoVista {
  id: string;
  titulo: string;
  descripcion: string;
  meta: string | null;
  acciones: string | null;
  indicador: string;
  peso: number;
  tipoIndividual: "DESEMPENO" | "DESARROLLO" | null;
  lineaEstrategica: "L1" | "L2" | "L3" | "L4" | "L5" | null;
  competencia: string | null;
  linkRepositorio: string | null;
  estadoAprobacion: EstadoAprobacionObjetivo;
  comentarioAprobacion: string | null;
  // Un registro por corte (el más reciente, si hubo correcciones), ordenado
  // por número de corte ascendente — es la bitácora completa del periodo,
  // no solo el último.
  seguimientos: SeguimientoVista[];
  // Calificación final asignada por el evaluador al cierre del periodo:
  // numérica para DESEMPENO/GERENCIA/CORPORATIVO, sí/no para DESARROLLO.
  calificacionFinal: number | null;
  cumplioDesarrollo: boolean | null;
}

export interface MisObjetivos {
  periodo: { id: string; nombre: string; estado: string };
  corteActual: { id: string; numero: number; fechaLimite: Date } | null;
  nombreJefe: string | null;
  individuales: ObjetivoVista[];
  gerencia: { nombreGerencia: string | null; objetivos: ObjetivoVista[] };
  corporativos: ObjetivoVista[];
}

// Convierte un Objetivo con su bitácora de seguimientos (un registro vigente
// por corte, ya traído con `distinct: ["corteId"]`) al modelo de vista que
// consume la UI. Los `Decimal` de Prisma se normalizan a `number` aquí:
// cruzar la frontera Server → Client Component con un objeto `Decimal` no es
// serializable, así que esta es la última parada donde conviene hacerlo.
function aVista(objetivo: {
  id: string;
  titulo: string;
  descripcion: string;
  meta: string | null;
  acciones: string | null;
  indicador: string;
  peso: { toNumber(): number };
  tipoIndividual: "DESEMPENO" | "DESARROLLO" | null;
  lineaEstrategica: "L1" | "L2" | "L3" | "L4" | "L5" | null;
  competencia: string | null;
  linkRepositorio: string | null;
  estadoAprobacion: EstadoAprobacionObjetivo;
  comentarioAprobacion: string | null;
  seguimientos: Array<{
    comentario: string;
    createdAt: Date;
    corte: { numero: number };
    registrador: { nombre: string };
    porcentajeAvance: number | null;
  }>;
  calificacionFinal: { toNumber(): number } | null;
  cumplioDesarrollo: boolean | null;
}): ObjetivoVista {
  return {
    id: objetivo.id,
    titulo: objetivo.titulo,
    descripcion: objetivo.descripcion,
    meta: objetivo.meta,
    acciones: objetivo.acciones,
    indicador: objetivo.indicador,
    peso: objetivo.peso.toNumber(),
    tipoIndividual: objetivo.tipoIndividual,
    lineaEstrategica: objetivo.lineaEstrategica,
    competencia: objetivo.competencia,
    linkRepositorio: objetivo.linkRepositorio,
    estadoAprobacion: objetivo.estadoAprobacion,
    comentarioAprobacion: objetivo.comentarioAprobacion,
    seguimientos: objetivo.seguimientos
      .map((s) => ({
        numeroCorte: s.corte.numero,
        comentario: s.comentario,
        fecha: s.createdAt,
        registradoPorNombre: s.registrador.nombre,
        porcentajeAvance: s.porcentajeAvance,
      }))
      .sort((a, b) => a.numeroCorte - b.numeroCorte),
    calificacionFinal: objetivo.calificacionFinal?.toNumber() ?? null,
    cumplioDesarrollo: objetivo.cumplioDesarrollo,
  };
}

export async function obtenerMisObjetivos(usuarioId: string): Promise<MisObjetivos | null> {
  const periodo = await obtenerPeriodoActual();
  if (!periodo) return null;

  // `select` explícito — sin esto Prisma trae también `foto` (bytes de la
  // imagen de perfil) en cada carga de "Mis objetivos", de todos.
  const usuario = await db.usuario.findUniqueOrThrow({
    where: { id: usuarioId },
    select: {
      gerenciaId: true,
      gerencia: { select: { nombre: true } },
      jefe: { select: { nombre: true } },
    },
  });

  const bitacoraDeSeguimientos = {
    orderBy: [{ corteId: "asc" as const }, { version: "desc" as const }],
    distinct: ["corteId" as const],
    include: { corte: { select: { numero: true } }, registrador: { select: { nombre: true } } },
  };

  const [corteActual, individuales, gerencia, corporativos] = await Promise.all([
    obtenerCorteActual(periodo.id),
    db.objetivo.findMany({
      where: { periodoId: periodo.id, nivel: "INDIVIDUAL", usuarioId },
      include: { seguimientos: bitacoraDeSeguimientos },
      orderBy: { createdAt: "asc" },
    }),
    usuario.gerenciaId
      ? db.objetivo.findMany({
          where: { periodoId: periodo.id, nivel: "GERENCIA", gerenciaId: usuario.gerenciaId },
          include: { seguimientos: bitacoraDeSeguimientos },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    db.objetivo.findMany({
      where: { periodoId: periodo.id, nivel: "CORPORATIVO" },
      include: { seguimientos: bitacoraDeSeguimientos },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    periodo: { id: periodo.id, nombre: periodo.nombre, estado: periodo.estado },
    corteActual,
    nombreJefe: usuario.jefe?.nombre ?? null,
    individuales: individuales.map((o) => aVista(o)),
    gerencia: {
      nombreGerencia: usuario.gerencia?.nombre ?? null,
      objetivos: gerencia.map((o) => aVista(o)),
    },
    corporativos: corporativos.map((o) => aVista(o)),
  };
}
