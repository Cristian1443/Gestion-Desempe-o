import { db } from "@/server/db";
import { validarObjetivosGerencia } from "@/server/services/calculo-notas";
import {
  obtenerContextoFranjas,
  obtenerPeriodoActual,
  type ContextoFranjas,
} from "@/server/services/periodos.service";

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
  numero: number;
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
  // Un registro por seguimiento (el más reciente, si hubo correcciones),
  // ordenado por número de seguimiento ascendente.
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
  // Objetivos aprobados que ya tienen al menos un seguimiento registrado en
  // el seguimiento de referencia (el que está en curso o el último iniciado).
  conSeguimientoDeReferencia: number;
}

export interface MiGerencia {
  periodo: { id: string; nombre: string; estado: string };
  franjas: ContextoFranjas;
  gerencia: { id: string; nombre: string };
  objetivos: ObjetivoGerenciaVista[];
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
      .map((s) => ({ numero: s.seguimiento.numero, comentario: s.comentario, fecha: s.createdAt }))
      .sort((a, b) => a.numero - b.numero),
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
    objetivos,
    colaboradores,
  };
}
