import { db } from "@/server/db";
import { validarObjetivosCorporativos } from "@/server/services/calculo-notas";
import { obtenerCorteActual, obtenerPeriodoActual } from "@/server/services/periodos.service";

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
  numeroCorte: number;
  comentario: string;
  fecha: Date;
  // 0-100, visible para toda la organización. Puede ser `null` en registros
  // creados antes de que existiera este campo.
  porcentajeAvance: number | null;
}

export interface ObjetivoCorporativoVista {
  id: string;
  titulo: string;
  descripcion: string;
  meta: string;
  indicador: string;
  peso: number;
  // Un registro por corte (el más reciente, si hubo correcciones), ordenado
  // por número de corte ascendente.
  seguimientos: SeguimientoCorporativoVista[];
  // Calificación final (0-100) asignada por Gestión Humana/Admin al cierre
  // del periodo — ver calificaciones.service.ts.
  calificacionFinal: number | null;
}

export interface ObjetivosCorporativos {
  periodo: { id: string; nombre: string; estado: string };
  corteActual: { id: string; numero: number; fechaLimite: Date } | null;
  objetivos: ObjetivoCorporativoVista[];
}

export async function obtenerObjetivosCorporativosAdmin(): Promise<ObjetivosCorporativos | null> {
  const periodo = await obtenerPeriodoActual();
  if (!periodo) return null;

  const corteActual = await obtenerCorteActual(periodo.id);

  const objetivos = await db.objetivo.findMany({
    where: { periodoId: periodo.id, nivel: "CORPORATIVO" },
    include: {
      seguimientos: {
        orderBy: [{ corteId: "asc" }, { version: "desc" }],
        distinct: ["corteId"],
        include: { corte: { select: { numero: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return {
    periodo: { id: periodo.id, nombre: periodo.nombre, estado: periodo.estado },
    corteActual,
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
          numeroCorte: s.corte.numero,
          comentario: s.comentario,
          fecha: s.createdAt,
          porcentajeAvance: s.porcentajeAvance,
        }))
        .sort((a, b) => a.numeroCorte - b.numeroCorte),
      calificacionFinal: o.calificacionFinal?.toNumber() ?? null,
    })),
  };
}

export { CANTIDAD_OBJETIVOS_CORPORATIVOS };
