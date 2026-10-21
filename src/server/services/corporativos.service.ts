import { db } from "@/server/db";
import { validarObjetivosCorporativos } from "@/server/services/calculo-notas";
import {
  obtenerContextoFranjas,
  obtenerPeriodoActual,
  type ContextoFranjas,
} from "@/server/services/periodos.service";

export class ErrorCorporativo extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErrorCorporativo";
  }
}

export interface ObjetivoPropuestoCorporativo {
  titulo: string;
  descripcion: string;
  meta: string;
  indicador: string;
  unidadMedida: string;
}

const PESO_OBJETIVO_CORPORATIVO = 3.75;
const CANTIDAD_OBJETIVOS_CORPORATIVOS = 8;

// Igual que los de gerencia: no pasan por aprobación, los carga Gestión
// Humana y quedan vigentes de una vez. Solo una carga por periodo.
export async function crearObjetivosCorporativos(
  adminId: string,
  objetivos: ObjetivoPropuestoCorporativo[],
) {
  const periodo = await obtenerPeriodoActual();
  if (!periodo) {
    throw new ErrorCorporativo("No hay un periodo abierto para cargar objetivos.");
  }
  if (periodo.estado !== "ABIERTO") {
    throw new ErrorCorporativo("El periodo no está abierto para cargar objetivos.");
  }

  validarObjetivosCorporativos(
    objetivos.map((_, i) => ({
      id: String(i),
      peso: PESO_OBJETIVO_CORPORATIVO,
      calificacionFinal: null,
    })),
  );

  const existentes = await db.objetivo.count({
    where: { periodoId: periodo.id, nivel: "CORPORATIVO" },
  });
  if (existentes > 0) {
    throw new ErrorCorporativo("Ya se cargaron los objetivos corporativos para este periodo.");
  }

  await db.objetivo.createMany({
    data: objetivos.map((o) => ({
      periodoId: periodo.id,
      nivel: "CORPORATIVO" as const,
      titulo: o.titulo,
      descripcion: o.descripcion,
      meta: o.meta,
      indicador: o.indicador,
      unidadMedida: o.unidadMedida,
      peso: PESO_OBJETIVO_CORPORATIVO,
      estadoAprobacion: "APROBADO" as const,
      creadoPor: adminId,
      aprobadoPor: adminId,
      fechaAprobacion: new Date(),
    })),
  });
}

export interface SeguimientoCorporativoVista {
  numero: number;
  comentario: string;
  fecha: Date;
}

export interface ObjetivoCorporativoVista {
  id: string;
  titulo: string;
  descripcion: string;
  meta: string;
  indicador: string;
  peso: number;
  // Un registro por seguimiento (el más reciente, si hubo correcciones),
  // ordenado por número de seguimiento ascendente.
  seguimientos: SeguimientoCorporativoVista[];
  // Calificación final (0-100) asignada por Gestión Humana/Admin al cierre
  // del periodo — ver calificaciones.service.ts.
  calificacionFinal: number | null;
}

export interface ObjetivosCorporativos {
  periodo: { id: string; nombre: string; estado: string };
  franjas: ContextoFranjas;
  objetivos: ObjetivoCorporativoVista[];
}

export async function obtenerObjetivosCorporativosAdmin(): Promise<ObjetivosCorporativos | null> {
  const periodo = await obtenerPeriodoActual();
  if (!periodo) return null;

  const franjas = await obtenerContextoFranjas(periodo.id);

  const objetivos = await db.objetivo.findMany({
    where: { periodoId: periodo.id, nivel: "CORPORATIVO" },
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
    periodo: { id: periodo.id, nombre: periodo.nombre, estado: periodo.estado },
    franjas,
    objetivos: objetivos.map((o) => ({
      id: o.id,
      titulo: o.titulo,
      descripcion: o.descripcion,
      // Los objetivos CORPORATIVO siempre traen `meta` (la exige su propio
      // formulario de creación) — solo INDIVIDUAL puede dejarla nula.
      meta: o.meta as string,
      indicador: o.indicador,
      peso: o.peso.toNumber(),
      seguimientos: o.seguimientos
        .map((s) => ({
          numero: s.seguimiento.numero,
          comentario: s.comentario,
          fecha: s.createdAt,
        }))
        .sort((a, b) => a.numero - b.numero),
      calificacionFinal: o.calificacionFinal?.toNumber() ?? null,
    })),
  };
}

export { CANTIDAD_OBJETIVOS_CORPORATIVOS };
