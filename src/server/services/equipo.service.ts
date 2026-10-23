import type { EstadoAprobacionObjetivo } from "@prisma/client";
import { FILTRO_OBJETIVOS_ACTIVOS } from "@/lib/objetivos-config";
import { db } from "@/server/db";
import {
  obtenerContextoFranjas,
  obtenerPeriodoActual,
  type ContextoFranjas,
} from "@/server/services/periodos.service";

export interface SeguimientoEquipoVista {
  numero: number;
  // % de avance de la meta en ese seguimiento.
  porcentaje: number | null;
  comentario: string;
  fecha: Date;
}

export interface ObjetivoEquipoVista {
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
  // Un registro por seguimiento (el más reciente, si hubo correcciones), ordenado
  // por número de seguimiento ascendente.
  seguimientos: SeguimientoEquipoVista[];
  // Calificación final: numérica para DESEMPENO, sí/no para DESARROLLO (ver
  // calculo-notas.ts — DESARROLLO no tiene nota, solo cumplimiento).
  calificacionFinal: number | null;
  cumplioDesarrollo: boolean | null;
  // Resultado final Cumple / No cumple (objetivos de desempeño).
  cumplido: boolean | null;
}

export interface ColaboradorEquipo {
  usuarioId: string;
  nombre: string;
  cargo: string | null;
  tieneFoto: boolean;
  objetivos: ObjetivoEquipoVista[];
}

export interface MiEquipo {
  periodo: { id: string; nombre: string; estado: string };
  franjas: ContextoFranjas;
  jefe: {
    usuarioId: string;
    nombre: string;
    cargo: string | null;
    gerenciaNombre: string | null;
    tieneFoto: boolean;
  };
  colaboradores: ColaboradorEquipo[];
}

export async function obtenerMiEquipo(jefeId: string): Promise<MiEquipo | null> {
  const periodo = await obtenerPeriodoActual();
  if (!periodo) return null;

  const franjas = await obtenerContextoFranjas(periodo.id);

  const [jefe, colaboradores] = await Promise.all([
    db.usuario.findUniqueOrThrow({
      where: { id: jefeId },
      include: { gerencia: true },
    }),
    db.usuario.findMany({
      where: { jefeId, activo: true },
      select: { id: true, nombre: true, cargo: true, foto: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const vistas = await Promise.all(
    colaboradores.map(async (colaborador): Promise<ColaboradorEquipo> => {
      const objetivos = await db.objetivo.findMany({
        where: { periodoId: periodo.id, nivel: "INDIVIDUAL", usuarioId: colaborador.id, ...FILTRO_OBJETIVOS_ACTIVOS },
        include: {
          seguimientos: {
            orderBy: [{ seguimientoId: "asc" }, { version: "desc" }],
            distinct: ["seguimientoId"],
            include: { seguimiento: { select: { numero: true } } },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      return {
        usuarioId: colaborador.id,
        nombre: colaborador.nombre,
        cargo: colaborador.cargo,
        tieneFoto: colaborador.foto !== null,
        objetivos: objetivos.map((o) => ({
          id: o.id,
          titulo: o.titulo,
          descripcion: o.descripcion,
          meta: o.meta,
          acciones: o.acciones,
          indicador: o.indicador,
          peso: o.peso.toNumber(),
          tipoIndividual: o.tipoIndividual,
          lineaEstrategica: o.lineaEstrategica,
          competencia: o.competencia,
          linkRepositorio: o.linkRepositorio,
          estadoAprobacion: o.estadoAprobacion,
          comentarioAprobacion: o.comentarioAprobacion,
          seguimientos: o.seguimientos
            .map((s) => ({ numero: s.seguimiento.numero, porcentaje: s.porcentaje, comentario: s.comentario, fecha: s.createdAt }))
            .sort((a, b) => a.numero - b.numero),
          calificacionFinal: o.calificacionFinal?.toNumber() ?? null,
          cumplioDesarrollo: o.cumplioDesarrollo,
          cumplido: o.cumplido,
        })),
      };
    }),
  );

  return {
    periodo: { id: periodo.id, nombre: periodo.nombre, estado: periodo.estado },
    franjas,
    jefe: {
      usuarioId: jefe.id,
      nombre: jefe.nombre,
      cargo: jefe.cargo,
      gerenciaNombre: jefe.gerencia?.nombre ?? null,
      tieneFoto: jefe.foto !== null,
    },
    colaboradores: vistas,
  };
}
