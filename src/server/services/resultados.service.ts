import { db } from "@/server/db";
import { FILTRO_OBJETIVOS_ACTIVOS } from "@/lib/objetivos-config";
import { primerDiaDelMes, mesActual } from "@/lib/mes";
import { obtenerContextoFranjas, obtenerPeriodoActual } from "@/server/services/periodos.service";

export interface ObjetivoSinSeguimiento {
  id: string;
  titulo: string;
  nivel: "INDIVIDUAL" | "GERENCIA" | "CORPORATIVO";
  propietario: string;
}

export interface CoberturaNivel {
  conSeguimiento: number;
  total: number;
}

export interface GerenciaResultado {
  gerenciaId: string;
  nombre: string;
  colaboradoresTotal: number;
  colaboradoresConObjetivos: number;
  objetivosIndividualesTotal: number;
  objetivosConSeguimiento: number;
}

export interface Resultados {
  periodo: { id: string; nombre: string };
  // El seguimiento contra el que se mide la cobertura: el que está en curso o,
  // si no hay, el último que ya empezó. Null si todavía no empieza ninguno.
  seguimientoReferencia: { numero: number; fechaInicio: Date; fechaFin: Date; enCurso: boolean } | null;
  coberturaIndividual: CoberturaNivel | null;
  coberturaGerencia: CoberturaNivel | null;
  coberturaCorporativo: CoberturaNivel | null;
  totalColaboradores: number;
  totalColaboradoresConObjetivos: number;
  porGerencia: GerenciaResultado[];
  objetivosSinSeguimiento: ObjetivoSinSeguimiento[];
}

function calcularCobertura<T extends { tieneSeguimiento: boolean }>(
  objetivos: T[],
): CoberturaNivel | null {
  if (objetivos.length === 0) return null;
  return {
    conSeguimiento: objetivos.filter((o) => o.tieneSeguimiento).length,
    total: objetivos.length,
  };
}

// Vista operativa de "quién ya hizo el seguimiento en curso y quién no" — no
// es el resultado final del periodo (`Objetivo.calificacionFinal`, un juicio
// del evaluador que se pone al final, dentro de su franja).
export async function obtenerResultados(): Promise<Resultados | null> {
  const periodo = await obtenerPeriodoActual();
  if (!periodo) return null;

  const { seguimientoEnCurso, seguimientoReferencia } = await obtenerContextoFranjas(periodo.id);
  const seguimientoDeReferencia = seguimientoReferencia
    ? { where: { seguimientoId: seguimientoReferencia.id }, take: 1 as const }
    : { take: 0 as const };

  const [individuales, gerenciaObjetivos, corporativos, usuarios] = await Promise.all([
    db.objetivo.findMany({
      where: { periodoId: periodo.id, nivel: "INDIVIDUAL", estadoAprobacion: "APROBADO", ...FILTRO_OBJETIVOS_ACTIVOS },
      include: {
        seguimientos: seguimientoDeReferencia,
        usuario: { select: { nombre: true, gerenciaId: true } },
      },
    }),
    db.objetivo.findMany({
      where: { periodoId: periodo.id, nivel: "GERENCIA" },
      include: { seguimientos: seguimientoDeReferencia, gerencia: { select: { nombre: true } } },
    }),
    // Los indicadores de la empresa se siguen mes a mes: cuenta quien ya tiene
    // avance registrado en el mes en curso.
    db.objetivo.findMany({
      where: { periodoId: periodo.id, nivel: "CORPORATIVO" },
      include: { avances: { where: { mes: primerDiaDelMes(mesActual()) }, take: 1 } },
    }),
    db.usuario.findMany({
      where: { activo: true, gerenciaId: { not: null } },
      select: { id: true, gerenciaId: true },
    }),
  ]);

  const gerencias = await db.gerencia.findMany();

  const individualesConCobertura = individuales.map((o) => ({
    ...o,
    tieneSeguimiento: o.seguimientos.length > 0,
  }));
  const gerenciaConCobertura = gerenciaObjetivos.map((o) => ({
    ...o,
    tieneSeguimiento: o.seguimientos.length > 0,
  }));
  const corporativosConCobertura = corporativos.map((o) => ({
    ...o,
    tieneSeguimiento: o.avances.length > 0,
  }));

  const colaboradoresConObjetivosIds = new Set(
    individuales.map((o) => o.usuarioId).filter((id): id is string => id !== null),
  );

  const porGerencia: GerenciaResultado[] = gerencias.map((gerencia) => {
    const colaboradoresDeLaGerencia = usuarios.filter((u) => u.gerenciaId === gerencia.id);
    const objetivosDeLaGerencia = individualesConCobertura.filter(
      (o) => o.usuario?.gerenciaId === gerencia.id,
    );
    const colaboradoresConObjetivos = new Set(
      objetivosDeLaGerencia.map((o) => o.usuarioId).filter((id): id is string => id !== null),
    );

    return {
      gerenciaId: gerencia.id,
      nombre: gerencia.nombre,
      colaboradoresTotal: colaboradoresDeLaGerencia.length,
      colaboradoresConObjetivos: colaboradoresConObjetivos.size,
      objetivosIndividualesTotal: objetivosDeLaGerencia.length,
      objetivosConSeguimiento: objetivosDeLaGerencia.filter((o) => o.tieneSeguimiento)
        .length,
    };
  });

  const objetivosSinSeguimiento: ObjetivoSinSeguimiento[] = [];

  for (const o of individualesConCobertura) {
    if (o.tieneSeguimiento || !o.usuario) continue;
    objetivosSinSeguimiento.push({
      id: o.id,
      titulo: o.titulo,
      nivel: "INDIVIDUAL",
      propietario: o.usuario.nombre,
    });
  }

  for (const o of gerenciaConCobertura) {
    if (o.tieneSeguimiento || !o.gerencia) continue;
    objetivosSinSeguimiento.push({
      id: o.id,
      titulo: o.titulo,
      nivel: "GERENCIA",
      propietario: `${o.gerencia.nombre} (gerencia)`,
    });
  }

  for (const o of corporativosConCobertura) {
    if (o.tieneSeguimiento) continue;
    objetivosSinSeguimiento.push({ id: o.id, titulo: o.titulo, nivel: "CORPORATIVO", propietario: "Indicador de la empresa" });
  }

  return {
    periodo: { id: periodo.id, nombre: periodo.nombre },
    seguimientoReferencia: seguimientoReferencia
      ? {
          numero: seguimientoReferencia.numero,
          fechaInicio: seguimientoReferencia.fechaInicio,
          fechaFin: seguimientoReferencia.fechaFin,
          enCurso: seguimientoEnCurso?.id === seguimientoReferencia.id,
        }
      : null,
    coberturaIndividual: calcularCobertura(individualesConCobertura),
    coberturaGerencia: calcularCobertura(gerenciaConCobertura),
    coberturaCorporativo: calcularCobertura(corporativosConCobertura),
    totalColaboradores: usuarios.length,
    totalColaboradoresConObjetivos: colaboradoresConObjetivosIds.size,
    porGerencia,
    objetivosSinSeguimiento,
  };
}
