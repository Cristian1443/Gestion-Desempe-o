import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { estadoFranja, hoyEnBogota, type EstadoFranja } from "@/lib/franja";
import { claveMes, mesActual, mesesDelPeriodo, mesesRegistrables, primerDiaDelMes } from "@/lib/mes";
import type { LineaIndicadorCodigo } from "@/lib/indicadores-config";
import { CANTIDAD_OBJETIVOS_CORPORATIVOS } from "@/server/services/calculo-notas";
import { ErrorCalificacion, exigirFranjaCumplimiento } from "@/server/services/calificaciones.service";
import { obtenerPeriodoActual } from "@/server/services/periodos.service";

// Indicadores de la empresa = objetivos de nivel CORPORATIVO. No llevan peso ni
// nota: durante el año se les registra un avance mensual (% acumulado y un
// comentario) y al final se marca Cumple / No cumple. La autorización (Gestor
// corporativo, Gestión Humana o Admin) se resuelve en la capa de Server Action
// con `requireRol`, no aquí.
export class ErrorIndicador extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErrorIndicador";
  }
}

export interface DatosIndicador {
  lineaEstrategica: LineaIndicadorCodigo;
  // Objetivo estratégico (se guarda en `descripcion`).
  descripcion: string;
  // El indicador estratégico (se guarda en `titulo` y en `indicador`).
  titulo: string;
  meta: string;
}

async function periodoAbiertoOFalla() {
  const periodo = await obtenerPeriodoActual();
  if (!periodo) throw new ErrorIndicador("No hay un periodo abierto.");
  return periodo;
}

async function obtenerIndicadorOFalla(objetivoId: string) {
  const objetivo = await db.objetivo.findUnique({
    where: { id: objetivoId },
    include: { periodo: true, _count: { select: { avances: true } } },
  });
  if (!objetivo || objetivo.nivel !== "CORPORATIVO") {
    throw new ErrorIndicador("El indicador no existe.");
  }
  if (objetivo.periodo.estado !== "ABIERTO") {
    throw new ErrorIndicador("El periodo no está abierto.");
  }
  return objetivo;
}

// Siempre son 8 indicadores para toda la Corporación: no se puede cargar un
// noveno (y el periodo no se cierra con menos, ver `cerrarPeriodo`).
export async function crearIndicador(input: DatosIndicador & { creadoPor: string }) {
  const periodo = await periodoAbiertoOFalla();

  const cargados = await db.objetivo.count({ where: { periodoId: periodo.id, nivel: "CORPORATIVO" } });
  if (cargados >= CANTIDAD_OBJETIVOS_CORPORATIVOS) {
    throw new ErrorIndicador(`Ya están los ${CANTIDAD_OBJETIVOS_CORPORATIVOS} indicadores de la empresa.`);
  }

  return db.objetivo.create({
    data: {
      periodoId: periodo.id,
      nivel: "CORPORATIVO",
      titulo: input.titulo,
      descripcion: input.descripcion,
      meta: input.meta,
      indicador: input.titulo,
      lineaEstrategica: input.lineaEstrategica,
      peso: 0,
      estadoAprobacion: "APROBADO",
      creadoPor: input.creadoPor,
      aprobadoPor: input.creadoPor,
      fechaAprobacion: new Date(),
    },
  });
}

export async function editarIndicador(input: DatosIndicador & { objetivoId: string }) {
  await obtenerIndicadorOFalla(input.objetivoId);

  return db.objetivo.update({
    where: { id: input.objetivoId },
    data: {
      titulo: input.titulo,
      descripcion: input.descripcion,
      meta: input.meta,
      indicador: input.titulo,
      lineaEstrategica: input.lineaEstrategica,
    },
  });
}

// Solo se elimina un indicador que todavía no tiene avances ni resultado:
// borrarlo con historial perdería esos registros en silencio.
export async function eliminarIndicador(objetivoId: string) {
  const objetivo = await obtenerIndicadorOFalla(objetivoId);
  if (objetivo._count.avances > 0 || objetivo.cumplido !== null) {
    throw new ErrorIndicador("No se puede eliminar un indicador que ya tiene avances o resultado.");
  }
  await db.objetivo.delete({ where: { id: objetivoId } });
}

// Avance de un mes: el % acumulado y un comentario. Se puede registrar el mes
// en curso y completar o corregir meses anteriores del periodo, nunca meses
// futuros. Corregir un mes crea una versión nueva; la de mayor número es la
// vigente y el historial queda intacto.
export async function registrarAvanceMensual(input: {
  objetivoId: string;
  mes: string;
  porcentaje: number;
  comentario: string;
  registradoPor: string;
}) {
  const objetivo = await obtenerIndicadorOFalla(input.objetivoId);

  const registrables = mesesRegistrables(objetivo.periodo.fechaInicio, objetivo.periodo.fechaFin);
  if (!registrables.includes(input.mes)) {
    const delPeriodo = mesesDelPeriodo(objetivo.periodo.fechaInicio, objetivo.periodo.fechaFin);
    throw new ErrorIndicador(
      delPeriodo.includes(input.mes)
        ? "No se puede registrar el avance de un mes que todavía no llega."
        : "Ese mes no pertenece al periodo.",
    );
  }

  const mes = primerDiaDelMes(input.mes);
  const ultimo = await db.avanceIndicador.findFirst({
    where: { objetivoId: objetivo.id, mes },
    orderBy: { version: "desc" },
  });

  try {
    return await db.avanceIndicador.create({
      data: {
        objetivoId: objetivo.id,
        mes,
        version: ultimo ? ultimo.version + 1 : 1,
        porcentaje: input.porcentaje,
        comentario: input.comentario,
        registradoPor: input.registradoPor,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ErrorIndicador("Se guardó otro registro al mismo tiempo. Recarga la página e inténtalo de nuevo.");
    }
    throw error;
  }
}

// Resultado final del indicador. Solo se puede marcar dentro de la franja del
// resultado final que Gestión Humana define para el periodo.
export async function marcarCumplimiento(input: { objetivoId: string; cumple: boolean; marcadoPor: string }) {
  const objetivo = await obtenerIndicadorOFalla(input.objetivoId);

  try {
    exigirFranjaCumplimiento(objetivo.periodo);
  } catch (error) {
    if (error instanceof ErrorCalificacion) throw new ErrorIndicador(error.message);
    throw error;
  }

  return db.objetivo.update({
    where: { id: input.objetivoId },
    data: { cumplido: input.cumple, calificadoPor: input.marcadoPor, fechaCalificacion: new Date() },
  });
}

// --- Vista ---

export interface AvanceMesVista {
  mes: string; // "AAAA-MM"
  porcentaje: number;
  comentario: string;
  fecha: Date;
  registradoPorNombre: string;
}

export type EstadoIndicador = "CUMPLE" | "NO_CUMPLE" | "EN_SEGUIMIENTO";

export interface IndicadorVista {
  id: string;
  titulo: string;
  descripcion: string;
  meta: string;
  indicador: string;
  unidadMedida: string | null;
  // Línea estratégica (L1 a L4); nula en indicadores cargados antes de este campo.
  lineaEstrategica: string | null;
  // Un registro vigente por mes, de enero a diciembre.
  avances: AvanceMesVista[];
  ultimoPorcentaje: number | null;
  cumplido: boolean | null;
  estado: EstadoIndicador;
}

export interface Indicadores {
  periodo: { id: string; nombre: string };
  // Siempre deben ser `tope` (8); `indicadores.length` dice cuántos van.
  tope: number;
  // Todos los meses del periodo, para dibujar la tira.
  meses: string[];
  mesActual: string;
  // Los que ya se pueden registrar (hasta el mes en curso).
  mesesRegistrables: string[];
  cumplimiento: { inicio: Date; fin: Date; estado: EstadoFranja } | null;
  // Quién carga y hace el seguimiento (usuarios activos con rol Gestor corporativo).
  responsables: string[];
  indicadores: IndicadorVista[];
}

export async function obtenerIndicadores(): Promise<Indicadores | null> {
  const periodo = await obtenerPeriodoActual();
  if (!periodo) return null;

  const hoy = hoyEnBogota();

  const [objetivos, responsables] = await Promise.all([
    db.objetivo.findMany({
      where: { periodoId: periodo.id, nivel: "CORPORATIVO" },
      include: {
        avances: {
          orderBy: [{ mes: "asc" }, { version: "desc" }],
          distinct: ["mes"],
          include: { registrador: { select: { nombre: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.usuario.findMany({
      where: { activo: true, roles: { some: { rol: "GESTOR_CORPORATIVO" } } },
      select: { nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const indicadores: IndicadorVista[] = objetivos.map((o) => {
    const avances = o.avances.map((a) => ({
      mes: claveMes(a.mes),
      porcentaje: a.porcentaje,
      comentario: a.comentario,
      fecha: a.createdAt,
      registradoPorNombre: a.registrador.nombre,
    }));

    return {
      id: o.id,
      titulo: o.titulo,
      descripcion: o.descripcion,
      // Los corporativos siempre traen `meta` (la exige su formulario de creación).
      meta: o.meta as string,
      indicador: o.indicador,
      unidadMedida: o.unidadMedida,
      lineaEstrategica: o.lineaEstrategica,
      avances,
      ultimoPorcentaje: avances[avances.length - 1]?.porcentaje ?? null,
      cumplido: o.cumplido,
      estado: o.cumplido === null ? "EN_SEGUIMIENTO" : o.cumplido ? "CUMPLE" : "NO_CUMPLE",
    };
  });

  return {
    periodo: { id: periodo.id, nombre: periodo.nombre },
    tope: CANTIDAD_OBJETIVOS_CORPORATIVOS,
    meses: mesesDelPeriodo(periodo.fechaInicio, periodo.fechaFin),
    mesActual: mesActual(hoy),
    mesesRegistrables: mesesRegistrables(periodo.fechaInicio, periodo.fechaFin, hoy),
    cumplimiento:
      periodo.cumplimientoInicio && periodo.cumplimientoFin
        ? {
            inicio: periodo.cumplimientoInicio,
            fin: periodo.cumplimientoFin,
            estado: estadoFranja(periodo.cumplimientoInicio, periodo.cumplimientoFin, hoy),
          }
        : null,
    responsables: responsables.map((r) => r.nombre),
    indicadores,
  };
}

// Cantidad de indicadores del periodo abierto, para la tarjeta de "Mis objetivos".
export async function contarIndicadores(): Promise<number> {
  const periodo = await obtenerPeriodoActual();
  if (!periodo) return 0;
  return db.objetivo.count({ where: { periodoId: periodo.id, nivel: "CORPORATIVO" } });
}
