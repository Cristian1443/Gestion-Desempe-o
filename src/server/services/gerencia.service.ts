import { db } from "@/server/db";
import { validarObjetivosGerencia } from "@/server/services/calculo-notas";
import { obtenerCorteActual, obtenerPeriodoActual } from "@/server/services/periodos.service";

export class ErrorGerencia extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErrorGerencia";
  }
}

export interface ObjetivoPropuestoGerencia {
  titulo: string;
  descripcion: string;
  meta: string;
  indicador: string;
  unidadMedida: string;
}

const PESO_OBJETIVO_GERENCIA = 15;

// Los 2 objetivos de gerencia no pasan por un flujo de aprobación (a
// diferencia de los individuales): el gerente los carga y quedan vigentes de
// una vez, tal como se definió para este nivel. Solo se permite cargarlos
// una vez por periodo — si hace falta corregirlos hoy no hay una vía de
// edición; queda para una futura iteración de administración de periodos.
export async function crearObjetivosGerencia(
  gerenteId: string,
  objetivos: ObjetivoPropuestoGerencia[],
) {
  const gerencia = await db.gerencia.findFirst({ where: { gerenteId } });
  if (!gerencia) {
    throw new ErrorGerencia("No eres el gerente de ninguna gerencia.");
  }

  const periodo = await obtenerPeriodoActual();
  if (!periodo) {
    throw new ErrorGerencia("No hay un periodo abierto para cargar objetivos.");
  }
  if (periodo.estado !== "ABIERTO") {
    throw new ErrorGerencia("El periodo no está abierto para cargar objetivos.");
  }

  validarObjetivosGerencia(
    objetivos.map((_, i) => ({ id: String(i), peso: PESO_OBJETIVO_GERENCIA, calificacionFinal: null })),
  );

  const existentes = await db.objetivo.count({
    where: { periodoId: periodo.id, nivel: "GERENCIA", gerenciaId: gerencia.id },
  });
  if (existentes > 0) {
    throw new ErrorGerencia("Ya cargaste los objetivos de gerencia para este periodo.");
  }

  await db.objetivo.createMany({
    data: objetivos.map((o) => ({
      periodoId: periodo.id,
      nivel: "GERENCIA" as const,
      gerenciaId: gerencia.id,
      titulo: o.titulo,
      descripcion: o.descripcion,
      meta: o.meta,
      indicador: o.indicador,
      unidadMedida: o.unidadMedida,
      peso: PESO_OBJETIVO_GERENCIA,
      estadoAprobacion: "APROBADO" as const,
      creadoPor: gerenteId,
      aprobadoPor: gerenteId,
      fechaAprobacion: new Date(),
    })),
  });
}

export interface SeguimientoGerenciaVista {
  numeroCorte: number;
  comentario: string;
  fecha: Date;
}

export interface ObjetivoGerenciaVista {
  id: string;
  titulo: string;
  descripcion: string;
  meta: string;
  indicador: string;
  peso: number;
  // Un registro por corte (el más reciente, si hubo correcciones), ordenado
  // por número de corte ascendente.
  seguimientos: SeguimientoGerenciaVista[];
  // Calificación final (0-100) asignada por el gerente al cierre del
  // periodo — ver calificaciones.service.ts.
  calificacionFinal: number | null;
}

export interface ColaboradorConsolidado {
  usuarioId: string;
  nombre: string;
  cargo: string | null;
  totalObjetivos: number;
  aprobados: number;
  pendientes: number;
  conSeguimientoDelCorteActual: number;
}

export interface MiGerencia {
  periodo: { id: string; nombre: string; estado: string };
  corteActual: { id: string; numero: number; fechaLimite: Date } | null;
  gerencia: { id: string; nombre: string };
  objetivos: ObjetivoGerenciaVista[];
  colaboradores: ColaboradorConsolidado[];
}

export async function obtenerMiGerencia(gerenteId: string): Promise<MiGerencia | null> {
  const gerencia = await db.gerencia.findFirst({ where: { gerenteId } });
  if (!gerencia) return null;

  const periodo = await obtenerPeriodoActual();
  if (!periodo) return null;

  const corteActual = await obtenerCorteActual(periodo.id);

  const objetivosGerencia = await db.objetivo.findMany({
    where: { periodoId: periodo.id, nivel: "GERENCIA", gerenciaId: gerencia.id },
    include: {
      seguimientos: {
        orderBy: [{ corteId: "asc" }, { version: "desc" }],
        distinct: ["corteId"],
        include: { corte: { select: { numero: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const objetivos: ObjetivoGerenciaVista[] = objetivosGerencia.map((o) => ({
    id: o.id,
    titulo: o.titulo,
    descripcion: o.descripcion,
    // Los objetivos GERENCIA siempre traen `meta` (la exige su propio
    // formulario de creación) — solo INDIVIDUAL puede dejarla nula.
    meta: o.meta as string,
    indicador: o.indicador,
    peso: o.peso.toNumber(),
    seguimientos: o.seguimientos
      .map((s) => ({ numeroCorte: s.corte.numero, comentario: s.comentario, fecha: s.createdAt }))
      .sort((a, b) => a.numeroCorte - b.numeroCorte),
    calificacionFinal: o.calificacionFinal?.toNumber() ?? null,
  }));

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
          seguimientos: corteActual
            ? { where: { corteId: corteActual.id }, take: 1 }
            : { take: 0 },
        },
      });

      const aprobados = objetivosIndividuales.filter((o) => o.estadoAprobacion === "APROBADO");
      const pendientes = objetivosIndividuales.filter(
        (o) => o.estadoAprobacion === "PENDIENTE_APROBACION",
      );
      const conSeguimientoDelCorteActual = aprobados.filter((o) => o.seguimientos.length > 0).length;

      return {
        usuarioId: colaborador.id,
        nombre: colaborador.nombre,
        cargo: colaborador.cargo,
        totalObjetivos: objetivosIndividuales.length,
        aprobados: aprobados.length,
        pendientes: pendientes.length,
        conSeguimientoDelCorteActual,
      };
    }),
  );

  return {
    periodo: { id: periodo.id, nombre: periodo.nombre, estado: periodo.estado },
    corteActual,
    gerencia: { id: gerencia.id, nombre: gerencia.nombre },
    objetivos,
    colaboradores,
  };
}
