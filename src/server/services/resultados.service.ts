import { db } from "@/server/db";
import { obtenerCorteActual, obtenerPeriodoActual } from "@/server/services/periodos.service";

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
  objetivosConSeguimientoDelCorte: number;
}

export interface Resultados {
  periodo: { id: string; nombre: string };
  corteActual: { id: string; numero: number; fechaLimite: Date } | null;
  coberturaIndividual: CoberturaNivel | null;
  coberturaGerencia: CoberturaNivel | null;
  coberturaCorporativo: CoberturaNivel | null;
  totalColaboradores: number;
  totalColaboradoresConObjetivos: number;
  porGerencia: GerenciaResultado[];
  objetivosSinSeguimiento: ObjetivoSinSeguimiento[];
}

function calcularCobertura<T extends { tieneSeguimientoDelCorte: boolean }>(
  objetivos: T[],
): CoberturaNivel | null {
  if (objetivos.length === 0) return null;
  return {
    conSeguimiento: objetivos.filter((o) => o.tieneSeguimientoDelCorte).length,
    total: objetivos.length,
  };
}

// Vista operativa de "quién ya hizo el seguimiento de este corte y quién no"
// — no es la nota final del periodo (`Objetivo.calificacionFinal`, un
// juicio del evaluador que se asigna al cierre, después de que existan los
// seguimientos de todos los cortes que definió el administrador).
export async function obtenerResultados(): Promise<Resultados | null> {
  const periodo = await obtenerPeriodoActual();
  if (!periodo) return null;

  const corteActual = await obtenerCorteActual(periodo.id);
  const seguimientoDelCorteActual = corteActual
    ? { where: { corteId: corteActual.id }, take: 1 as const }
    : { take: 0 as const };

  const [individuales, gerenciaObjetivos, corporativos, usuarios] = await Promise.all([
    db.objetivo.findMany({
      where: { periodoId: periodo.id, nivel: "INDIVIDUAL", estadoAprobacion: "APROBADO" },
      include: {
        seguimientos: seguimientoDelCorteActual,
        usuario: { select: { nombre: true, gerenciaId: true } },
      },
    }),
    db.objetivo.findMany({
      where: { periodoId: periodo.id, nivel: "GERENCIA" },
      include: { seguimientos: seguimientoDelCorteActual, gerencia: { select: { nombre: true } } },
    }),
    db.objetivo.findMany({
      where: { periodoId: periodo.id, nivel: "CORPORATIVO" },
      include: { seguimientos: seguimientoDelCorteActual },
    }),
    db.usuario.findMany({
      where: { activo: true, gerenciaId: { not: null } },
      select: { id: true, gerenciaId: true },
    }),
  ]);

  const gerencias = await db.gerencia.findMany();

  const individualesConCobertura = individuales.map((o) => ({
    ...o,
    tieneSeguimientoDelCorte: o.seguimientos.length > 0,
  }));
  const gerenciaConCobertura = gerenciaObjetivos.map((o) => ({
    ...o,
    tieneSeguimientoDelCorte: o.seguimientos.length > 0,
  }));
  const corporativosConCobertura = corporativos.map((o) => ({
    ...o,
    tieneSeguimientoDelCorte: o.seguimientos.length > 0,
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
      objetivosConSeguimientoDelCorte: objetivosDeLaGerencia.filter((o) => o.tieneSeguimientoDelCorte)
        .length,
    };
  });

  const objetivosSinSeguimiento: ObjetivoSinSeguimiento[] = [];

  for (const o of individualesConCobertura) {
    if (o.tieneSeguimientoDelCorte || !o.usuario) continue;
    objetivosSinSeguimiento.push({
      id: o.id,
      titulo: o.titulo,
      nivel: "INDIVIDUAL",
      propietario: o.usuario.nombre,
    });
  }

  for (const o of gerenciaConCobertura) {
    if (o.tieneSeguimientoDelCorte || !o.gerencia) continue;
    objetivosSinSeguimiento.push({
      id: o.id,
      titulo: o.titulo,
      nivel: "GERENCIA",
      propietario: `${o.gerencia.nombre} (gerencia)`,
    });
  }

  for (const o of corporativosConCobertura) {
    if (o.tieneSeguimientoDelCorte) continue;
    objetivosSinSeguimiento.push({ id: o.id, titulo: o.titulo, nivel: "CORPORATIVO", propietario: "Corporativo" });
  }

  return {
    periodo: { id: periodo.id, nombre: periodo.nombre },
    corteActual,
    coberturaIndividual: calcularCobertura(individualesConCobertura),
    coberturaGerencia: calcularCobertura(gerenciaConCobertura),
    coberturaCorporativo: calcularCobertura(corporativosConCobertura),
    totalColaboradores: usuarios.length,
    totalColaboradoresConObjetivos: colaboradoresConObjetivosIds.size,
    porGerencia,
    objetivosSinSeguimiento,
  };
}
