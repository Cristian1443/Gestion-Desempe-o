import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { errorDeFranjas, estadoFranja, hoyEnBogota, type EstadoFranja } from "@/lib/franja";
import { FILTRO_OBJETIVOS_ACTIVOS } from "@/lib/objetivos-config";
import { CANTIDAD_OBJETIVOS_CORPORATIVOS, CANTIDAD_OBJETIVOS_GERENCIA } from "@/server/services/calculo-notas";

// El periodo "actual" es el ABIERTO. Solo debería haber uno a la vez en la
// práctica, pero si hubiera más de uno (transición entre periodos), se toma el
// más reciente por fecha de inicio.
export async function obtenerPeriodoActual() {
  return db.periodo.findFirst({
    where: { estado: "ABIERTO" },
    orderBy: { fechaInicio: "desc" },
  });
}

// --- Franjas: qué está en curso hoy ---

export interface SeguimientoVista {
  id: string;
  numero: number;
  fechaInicio: Date;
  fechaFin: Date;
}

export interface ContextoFranjas {
  // Todos los seguimientos del periodo, en orden, con su estado de hoy. Sirve
  // para dibujar la tira de seguimientos de los indicadores de gerencia.
  todos: Array<SeguimientoVista & { estado: EstadoFranja }>;
  // El seguimiento cuya franja incluye hoy (a lo más uno: las franjas no se
  // traslapan). Si es null, nadie puede registrar seguimiento hoy.
  seguimientoEnCurso: SeguimientoVista | null;
  // El siguiente que todavía no empieza, para decirle a la gente cuándo vuelve.
  proximoSeguimiento: SeguimientoVista | null;
  // Contra cuál se mide la cobertura en pantalla: el que está en curso o, si no
  // hay, el último que ya empezó.
  seguimientoReferencia: SeguimientoVista | null;
  // Franja del resultado final. Null mientras Gestión Humana no la defina.
  cumplimiento: { inicio: Date; fin: Date; estado: EstadoFranja } | null;
}

export async function obtenerContextoFranjas(
  periodoId: string,
  hoy: string = hoyEnBogota(),
): Promise<ContextoFranjas> {
  const periodo = await db.periodo.findUniqueOrThrow({
    where: { id: periodoId },
    select: {
      cumplimientoInicio: true,
      cumplimientoFin: true,
      seguimientos: {
        orderBy: { numero: "asc" },
        select: { id: true, numero: true, fechaInicio: true, fechaFin: true },
      },
    },
  });

  const conEstado = periodo.seguimientos.map((s) => ({
    vista: s,
    estado: estadoFranja(s.fechaInicio, s.fechaFin, hoy),
  }));
  const enCurso = conEstado.find((s) => s.estado === "EN_CURSO")?.vista ?? null;
  const proximo = conEstado.find((s) => s.estado === "PROXIMA")?.vista ?? null;
  const iniciados = conEstado.filter((s) => s.estado !== "PROXIMA");

  return {
    todos: conEstado.map((s) => ({ ...s.vista, estado: s.estado })),
    seguimientoEnCurso: enCurso,
    proximoSeguimiento: proximo,
    seguimientoReferencia: enCurso ?? iniciados[iniciados.length - 1]?.vista ?? null,
    cumplimiento:
      periodo.cumplimientoInicio && periodo.cumplimientoFin
        ? {
            inicio: periodo.cumplimientoInicio,
            fin: periodo.cumplimientoFin,
            estado: estadoFranja(periodo.cumplimientoInicio, periodo.cumplimientoFin, hoy),
          }
        : null,
  };
}

// --- Administración de periodos (Gestión Humana / Admin) ---

export class ErrorPeriodo extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErrorPeriodo";
  }
}

export async function listarPeriodos() {
  return db.periodo.findMany({
    include: {
      seguimientos: {
        orderBy: { numero: "asc" },
        include: { _count: { select: { registros: true } } },
      },
    },
    orderBy: { fechaInicio: "desc" },
  });
}

export async function crearPeriodo(input: { nombre: string; fechaInicio: Date; fechaFin: Date }) {
  if (input.fechaFin <= input.fechaInicio) {
    throw new ErrorPeriodo("La fecha de fin debe ser posterior a la fecha de inicio.");
  }

  const existente = await db.periodo.findUnique({ where: { nombre: input.nombre } });
  if (existente) {
    throw new ErrorPeriodo(`Ya existe un periodo llamado "${input.nombre}".`);
  }

  return db.periodo.create({
    data: { nombre: input.nombre, fechaInicio: input.fechaInicio, fechaFin: input.fechaFin },
  });
}

async function cargarPeriodoConFranjas(periodoId: string) {
  const periodo = await db.periodo.findUnique({
    where: { id: periodoId },
    include: { seguimientos: { orderBy: { numero: "asc" } } },
  });
  if (!periodo) throw new ErrorPeriodo("El periodo no existe.");
  if (periodo.estado === "CERRADO") {
    throw new ErrorPeriodo("No se pueden cambiar las franjas de un periodo cerrado.");
  }
  return periodo;
}

type PeriodoConFranjas = Awaited<ReturnType<typeof cargarPeriodoConFranjas>>;

function validarOFallar(
  periodo: PeriodoConFranjas,
  seguimientos: Array<{ numero: number; fechaInicio: Date; fechaFin: Date }>,
  cumplimiento: { inicio: Date; fin: Date } | null,
) {
  const error = errorDeFranjas({
    periodo: { inicio: periodo.fechaInicio, fin: periodo.fechaFin },
    seguimientos: seguimientos.map((s) => ({ numero: s.numero, inicio: s.fechaInicio, fin: s.fechaFin })),
    cumplimiento,
  });
  if (error) throw new ErrorPeriodo(error);
}

function cumplimientoActual(periodo: PeriodoConFranjas) {
  return periodo.cumplimientoInicio && periodo.cumplimientoFin
    ? { inicio: periodo.cumplimientoInicio, fin: periodo.cumplimientoFin }
    : null;
}

// Los seguimientos se pueden agregar mientras el periodo no esté cerrado. El
// número lo asigna el sistema (el siguiente al último) y la franja debe quedar
// después de la del anterior.
export async function agregarSeguimiento(input: { periodoId: string; fechaInicio: Date; fechaFin: Date }) {
  const periodo = await cargarPeriodoConFranjas(input.periodoId);
  const numero = (periodo.seguimientos[periodo.seguimientos.length - 1]?.numero ?? 0) + 1;

  validarOFallar(
    periodo,
    [...periodo.seguimientos, { numero, fechaInicio: input.fechaInicio, fechaFin: input.fechaFin }],
    cumplimientoActual(periodo),
  );

  try {
    return await db.seguimiento.create({
      data: { periodoId: input.periodoId, numero, fechaInicio: input.fechaInicio, fechaFin: input.fechaFin },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ErrorPeriodo("Alguien agregó un seguimiento al mismo tiempo. Recarga la página e inténtalo de nuevo.");
    }
    throw error;
  }
}

export async function editarSeguimiento(input: { seguimientoId: string; fechaInicio: Date; fechaFin: Date }) {
  const seguimiento = await db.seguimiento.findUnique({ where: { id: input.seguimientoId } });
  if (!seguimiento) throw new ErrorPeriodo("El seguimiento no existe.");

  const periodo = await cargarPeriodoConFranjas(seguimiento.periodoId);

  validarOFallar(
    periodo,
    periodo.seguimientos.map((s) =>
      s.id === seguimiento.id ? { numero: s.numero, fechaInicio: input.fechaInicio, fechaFin: input.fechaFin } : s,
    ),
    cumplimientoActual(periodo),
  );

  return db.seguimiento.update({
    where: { id: seguimiento.id },
    data: { fechaInicio: input.fechaInicio, fechaFin: input.fechaFin },
  });
}

// Solo se puede eliminar un seguimiento que todavía no tiene registros: borrarlo
// con historial real adentro perdería esos comentarios en silencio.
export async function eliminarSeguimiento(seguimientoId: string) {
  const seguimiento = await db.seguimiento.findUnique({
    where: { id: seguimientoId },
    include: { periodo: true, _count: { select: { registros: true } } },
  });
  if (!seguimiento) throw new ErrorPeriodo("El seguimiento no existe.");
  if (seguimiento.periodo.estado === "CERRADO") {
    throw new ErrorPeriodo("No se pueden cambiar las franjas de un periodo cerrado.");
  }
  if (seguimiento._count.registros > 0) {
    throw new ErrorPeriodo("No se puede eliminar un seguimiento que ya tiene registros.");
  }

  await db.seguimiento.delete({ where: { id: seguimientoId } });
}

// Franja del resultado final. Puede terminar después del periodo, pero
// debe empezar cuando ya terminó el último seguimiento.
export async function definirFranjaCumplimiento(input: { periodoId: string; fechaInicio: Date; fechaFin: Date }) {
  const periodo = await cargarPeriodoConFranjas(input.periodoId);

  validarOFallar(periodo, periodo.seguimientos, { inicio: input.fechaInicio, fin: input.fechaFin });

  return db.periodo.update({
    where: { id: input.periodoId },
    data: { cumplimientoInicio: input.fechaInicio, cumplimientoFin: input.fechaFin },
  });
}

export async function abrirPeriodo(periodoId: string) {
  const periodo = await db.periodo.findUnique({
    where: { id: periodoId },
    include: { _count: { select: { seguimientos: true } } },
  });
  if (!periodo) {
    throw new ErrorPeriodo("El periodo no existe.");
  }
  if (periodo.estado !== "BORRADOR") {
    throw new ErrorPeriodo("Solo se puede abrir un periodo que esté en borrador.");
  }
  if (periodo._count.seguimientos === 0) {
    throw new ErrorPeriodo("Define al menos un seguimiento antes de abrir el periodo.");
  }
  if (!periodo.cumplimientoInicio || !periodo.cumplimientoFin) {
    throw new ErrorPeriodo("Define la franja del resultado final antes de abrir el periodo.");
  }

  const otroActivo = await db.periodo.findFirst({
    where: { id: { not: periodoId }, estado: "ABIERTO" },
  });
  if (otroActivo) {
    throw new ErrorPeriodo(
      `Ya hay un periodo activo ("${otroActivo.nombre}"). Ciérralo antes de abrir uno nuevo.`,
    );
  }

  return db.periodo.update({ where: { id: periodoId }, data: { estado: "ABIERTO" } });
}

// No se cierra un periodo con evaluaciones a medias: todo objetivo debe tener su
// resultado. Un objetivo DESARROLLO se considera calificado por
// `cumplioDesarrollo` (sí/no); un indicador (de la empresa o de gerencia) por
// `cumplido` (Cumple / No cumple), igual que los objetivos de desempeño (los de
// desarrollo no cuentan mientras estén desactivados). Además tienen que estar cargados todos los
// indicadores: 8 de la empresa y 2 por cada gerencia con gerente.
export async function cerrarPeriodo(periodoId: string) {
  const periodo = await db.periodo.findUnique({ where: { id: periodoId } });
  if (!periodo) {
    throw new ErrorPeriodo("El periodo no existe.");
  }
  if (periodo.estado !== "ABIERTO") {
    throw new ErrorPeriodo("Solo se puede cerrar un periodo que esté abierto.");
  }

  const [objetivos, gerencias] = await Promise.all([
    db.objetivo.findMany({
      where: { periodoId, ...FILTRO_OBJETIVOS_ACTIVOS },
      select: {
        nivel: true,
        gerenciaId: true,
        tipoIndividual: true,
        calificacionFinal: true,
        cumplioDesarrollo: true,
        cumplido: true,
      },
    }),
    db.gerencia.findMany({ where: { gerenteId: { not: null } }, select: { id: true, nombre: true } }),
  ]);

  const faltantes: string[] = [];
  const corporativos = objetivos.filter((o) => o.nivel === "CORPORATIVO").length;
  if (corporativos < CANTIDAD_OBJETIVOS_CORPORATIVOS) {
    faltantes.push(`indicadores de la empresa (${corporativos} de ${CANTIDAD_OBJETIVOS_CORPORATIVOS})`);
  }
  for (const gerencia of gerencias) {
    const cargados = objetivos.filter((o) => o.nivel === "GERENCIA" && o.gerenciaId === gerencia.id).length;
    if (cargados < CANTIDAD_OBJETIVOS_GERENCIA) {
      faltantes.push(`indicadores de ${gerencia.nombre} (${cargados} de ${CANTIDAD_OBJETIVOS_GERENCIA})`);
    }
  }
  if (faltantes.length > 0) {
    throw new ErrorPeriodo(`Faltan por cargar: ${faltantes.join("; ")}.`);
  }

  const sinCalificar = objetivos.filter((o) => {
    if (o.nivel === "INDIVIDUAL" && o.tipoIndividual === "DESARROLLO") return o.cumplioDesarrollo === null;
    return o.cumplido === null;
  });
  if (sinCalificar.length > 0) {
    const porNivel = sinCalificar.reduce<Record<string, number>>((acumulado, o) => {
      acumulado[o.nivel] = (acumulado[o.nivel] ?? 0) + 1;
      return acumulado;
    }, {});
    const detalle = Object.entries(porNivel)
      .map(([nivel, cantidad]) => `${cantidad} ${nivel}`)
      .join(", ");
    throw new ErrorPeriodo(
      `Todos los objetivos e indicadores deben tener su resultado antes de cerrar el periodo. Faltan: ${detalle}.`,
    );
  }

  return db.periodo.update({ where: { id: periodoId }, data: { estado: "CERRADO" } });
}
