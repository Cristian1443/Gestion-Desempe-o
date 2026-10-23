import { textoLinea } from "@/lib/indicadores-config";
import { LINEAS_ESTRATEGICAS, type LineaEstrategicaCodigo } from "@/lib/lineas-estrategicas";
import { claveMes } from "@/lib/mes";
import { FILTRO_OBJETIVOS_ACTIVOS } from "@/lib/objetivos-config";
import { db } from "@/server/db";

// Todo lo que lleva el PDF consolidado del periodo, ya ordenado y sin referencias
// a la base de datos: el documento solo lo dibuja. Solo lee.
export interface ResumenNivel {
  total: number;
  cumplen: number;
  noCumplen: number;
  sinResultado: number;
}

export interface SeguimientoPdf {
  numero: number;
  fechaInicio: Date;
  fechaFin: Date;
  porcentaje: number | null;
  comentario: string;
}

export interface AvanceMesPdf {
  mes: string; // "AAAA-MM"
  porcentaje: number;
  comentario: string;
}

export interface IndicadorPdf {
  // El indicador.
  titulo: string;
  // El objetivo estratégico.
  descripcion: string;
  meta: string;
  unidadMedida: string | null;
  indicador: string;
  // Línea estratégica (texto completo); nula en indicadores cargados antes de este campo.
  lineaEstrategica?: string | null;
  cumplido: boolean | null;
}

export interface IndicadorEmpresaPdf extends IndicadorPdf {
  avances: AvanceMesPdf[];
}

export interface IndicadorGerenciaPdf extends IndicadorPdf {
  seguimientos: SeguimientoPdf[];
}

export interface ObjetivoIndividualPdf {
  descripcion: string;
  acciones: string | null;
  indicador: string;
  lineaEstrategica: string | null;
  cumplido: boolean | null;
  seguimientos: Array<{ numero: number; comentario: string }>;
}

export interface PersonaPdf {
  nombre: string;
  cargo: string | null;
  objetivos: ObjetivoIndividualPdf[];
}

export interface ConsolidadoDatos {
  periodo: { nombre: string; fechaInicio: Date; fechaFin: Date; estado: string };
  generadoEn: Date;
  resumen: { individuales: ResumenNivel; gerencia: ResumenNivel; empresa: ResumenNivel };
  empresa: IndicadorEmpresaPdf[];
  gerencias: Array<{ nombre: string; gerente: string | null; indicadores: IndicadorGerenciaPdf[] }>;
  individuales: Array<{ gerencia: string; personas: PersonaPdf[] }>;
}

export function resumirResultados(resultados: Array<boolean | null>): ResumenNivel {
  const cumplen = resultados.filter((r) => r === true).length;
  const noCumplen = resultados.filter((r) => r === false).length;
  return { total: resultados.length, cumplen, noCumplen, sinResultado: resultados.length - cumplen - noCumplen };
}

const SIN_GERENCIA = "Sin gerencia asignada";

export async function obtenerConsolidado(periodoId: string): Promise<ConsolidadoDatos> {
  const periodo = await db.periodo.findUniqueOrThrow({ where: { id: periodoId } });

  const vigentePorSeguimiento = {
    orderBy: [{ seguimientoId: "asc" as const }, { version: "desc" as const }],
    distinct: ["seguimientoId" as const],
    include: { seguimiento: { select: { numero: true, fechaInicio: true, fechaFin: true } } },
  };

  const [corporativos, gerencias, objetivosGerencia, individuales] = await Promise.all([
    db.objetivo.findMany({
      where: { periodoId, nivel: "CORPORATIVO" },
      include: { avances: { orderBy: [{ mes: "asc" }, { version: "desc" }], distinct: ["mes"] } },
      orderBy: { createdAt: "asc" },
    }),
    db.gerencia.findMany({ include: { gerente: { select: { nombre: true } } }, orderBy: { nombre: "asc" } }),
    db.objetivo.findMany({
      where: { periodoId, nivel: "GERENCIA" },
      include: { seguimientos: vigentePorSeguimiento },
      orderBy: { createdAt: "asc" },
    }),
    db.objetivo.findMany({
      where: { periodoId, nivel: "INDIVIDUAL", estadoAprobacion: "APROBADO", ...FILTRO_OBJETIVOS_ACTIVOS },
      include: {
        usuario: { select: { id: true, nombre: true, cargo: true, gerencia: { select: { nombre: true } } } },
        seguimientos: {
          orderBy: [{ seguimientoId: "asc" }, { version: "desc" }],
          distinct: ["seguimientoId"],
          include: { seguimiento: { select: { numero: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const empresa: IndicadorEmpresaPdf[] = corporativos.map((o) => ({
    titulo: o.titulo,
    descripcion: o.descripcion,
    meta: o.meta ?? "",
    unidadMedida: o.unidadMedida,
    indicador: o.indicador,
    lineaEstrategica: textoLinea(o.lineaEstrategica),
    cumplido: o.cumplido,
    avances: o.avances.map((a) => ({ mes: claveMes(a.mes), porcentaje: a.porcentaje, comentario: a.comentario })),
  }));

  const gerenciasPdf = gerencias
    .map((g) => ({
      nombre: g.nombre,
      gerente: g.gerente?.nombre ?? null,
      indicadores: objetivosGerencia
        .filter((o) => o.gerenciaId === g.id)
        .map(
          (o): IndicadorGerenciaPdf => ({
            titulo: o.titulo,
            descripcion: o.descripcion,
            meta: o.meta ?? "",
            unidadMedida: o.unidadMedida,
            indicador: o.indicador,
            lineaEstrategica: textoLinea(o.lineaEstrategica),
            cumplido: o.cumplido,
            seguimientos: o.seguimientos
              .map((s) => ({
                numero: s.seguimiento.numero,
                fechaInicio: s.seguimiento.fechaInicio,
                fechaFin: s.seguimiento.fechaFin,
                porcentaje: s.porcentaje,
                comentario: s.comentario,
              }))
              .sort((a, b) => a.numero - b.numero),
          }),
        ),
    }))
    .filter((g) => g.indicadores.length > 0);

  // Individuales: por gerencia y, dentro de cada una, por persona.
  const porGerencia = new Map<string, Map<string, PersonaPdf>>();
  for (const o of individuales) {
    if (!o.usuario) continue;
    const gerenciaNombre = o.usuario.gerencia?.nombre ?? SIN_GERENCIA;
    const personas = porGerencia.get(gerenciaNombre) ?? new Map<string, PersonaPdf>();
    const persona = personas.get(o.usuario.id) ?? { nombre: o.usuario.nombre, cargo: o.usuario.cargo, objetivos: [] };
    persona.objetivos.push({
      descripcion: o.descripcion,
      acciones: o.acciones,
      indicador: o.indicador,
      lineaEstrategica: o.lineaEstrategica ? LINEAS_ESTRATEGICAS[o.lineaEstrategica as LineaEstrategicaCodigo] : null,
      cumplido: o.cumplido,
      seguimientos: o.seguimientos
        .map((s) => ({ numero: s.seguimiento.numero, comentario: s.comentario }))
        .sort((a, b) => a.numero - b.numero),
    });
    personas.set(o.usuario.id, persona);
    porGerencia.set(gerenciaNombre, personas);
  }

  const individualesPdf = [...porGerencia.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "es"))
    .map(([gerencia, personas]) => ({
      gerencia,
      personas: [...personas.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    }));

  return {
    periodo: { nombre: periodo.nombre, fechaInicio: periodo.fechaInicio, fechaFin: periodo.fechaFin, estado: periodo.estado },
    generadoEn: new Date(),
    resumen: {
      individuales: resumirResultados(individuales.map((o) => o.cumplido)),
      gerencia: resumirResultados(objetivosGerencia.map((o) => o.cumplido)),
      empresa: resumirResultados(corporativos.map((o) => o.cumplido)),
    },
    empresa,
    gerencias: gerenciasPdf,
    individuales: individualesPdf,
  };
}
