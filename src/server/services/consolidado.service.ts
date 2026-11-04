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
  // Fórmula del indicador, meta y peso (%).
  indicador: string;
  meta?: string | null;
  peso?: number | null;
  // Evidencias realizadas que registró el colaborador antes de cada seguimiento.
  evidencias?: Array<{ numero: number; texto: string }>;
  lineaEstrategica: string | null;
  // % de cumplimiento (0-100) y el resultado que sale de él.
  calificacionFinal?: number | null;
  cumplido: boolean | null;
  seguimientos: Array<{ numero: number; porcentaje?: number | null; comentario: string }>;
}

export interface PersonaPdf {
  nombre: string;
  cargo: string | null;
  objetivos: ObjetivoIndividualPdf[];
}

export interface EmpleadoPdf {
  nombre: string;
  cargo: string | null;
  gerencia: string | null;
  jefe: string | null;
}

export interface ConsolidadoDatos {
  // Presente solo cuando el documento es el resultado de UNA persona (no el consolidado de todos).
  empleado?: EmpleadoPdf;
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

// Con `usuarioId` trae solo lo de esa persona: sus metas individuales, los indicadores
// de su gerencia y los de la empresa. Sin él, el consolidado de toda la organización.
export async function obtenerConsolidado(periodoId: string, opciones: { usuarioId?: string } = {}): Promise<ConsolidadoDatos> {
  const periodo = await db.periodo.findUniqueOrThrow({ where: { id: periodoId } });

  // `select` explícito: sin él Prisma trae también los bytes de la foto de perfil.
  const persona = opciones.usuarioId
    ? await db.usuario.findUniqueOrThrow({
        where: { id: opciones.usuarioId },
        select: { nombre: true, cargo: true, gerenciaId: true, gerencia: { select: { nombre: true } }, jefe: { select: { nombre: true } } },
      })
    : null;

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
    db.gerencia.findMany({
      where: persona ? { id: persona.gerenciaId ?? "sin-gerencia" } : {},
      include: { gerente: { select: { nombre: true } } },
      orderBy: { nombre: "asc" },
    }),
    db.objetivo.findMany({
      where: { periodoId, nivel: "GERENCIA", ...(persona ? { gerenciaId: persona.gerenciaId ?? "sin-gerencia" } : {}) },
      include: { seguimientos: vigentePorSeguimiento },
      orderBy: { createdAt: "asc" },
    }),
    db.objetivo.findMany({
      where: {
        periodoId,
        nivel: "INDIVIDUAL",
        estadoAprobacion: "APROBADO",
        ...FILTRO_OBJETIVOS_ACTIVOS,
        ...(opciones.usuarioId ? { usuarioId: opciones.usuarioId } : {}),
      },
      include: {
        usuario: { select: { id: true, nombre: true, cargo: true, gerencia: { select: { nombre: true } } } },
        seguimientos: {
          orderBy: [{ seguimientoId: "asc" }, { version: "desc" }],
          distinct: ["seguimientoId"],
          include: { seguimiento: { select: { numero: true } } },
        },
        evidencias: { include: { seguimiento: { select: { numero: true } } } },
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
      meta: o.meta,
      peso: o.peso.toNumber(),
      lineaEstrategica: o.lineaEstrategica ? LINEAS_ESTRATEGICAS[o.lineaEstrategica as LineaEstrategicaCodigo] : null,
      calificacionFinal: o.calificacionFinal?.toNumber() ?? null,
      cumplido: o.cumplido,
      evidencias: o.evidencias
        .map((e) => ({ numero: e.seguimiento.numero, texto: e.texto }))
        .sort((a, b) => a.numero - b.numero),
      seguimientos: o.seguimientos
        .map((s) => ({ numero: s.seguimiento.numero, porcentaje: s.porcentaje, comentario: s.comentario }))
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
    empleado: persona
      ? { nombre: persona.nombre, cargo: persona.cargo, gerencia: persona.gerencia?.nombre ?? null, jefe: persona.jefe?.nombre ?? null }
      : undefined,
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
