import { estadoFranja, fechaISO, hoyEnBogota, type EstadoFranja } from "@/lib/franja";
import { db } from "@/server/db";
import { ErrorPeriodo } from "@/server/services/periodos.service";

// Cronograma del periodo: lo que se ve como calendario para todos. Junta tres
// fuentes, cada una con su propia tabla, para que las fechas no se repitan:
//  - las actividades (cargar indicadores, aprobación de jefes, carga de evidencia…),
//  - los seguimientos numerados,
//  - la franja del resultado final (validación de evidencia y evaluación del jefe).
export type TipoItemCronograma = "actividad" | "seguimiento" | "resultado";

export interface ItemCronograma {
  clave: string;
  tipo: TipoItemCronograma;
  nombre: string;
  inicio: Date;
  fin: Date;
  estado: EstadoFranja;
}

const ORDINALES = ["Primer", "Segundo", "Tercer", "Cuarto", "Quinto", "Sexto", "Séptimo", "Octavo", "Noveno", "Décimo"];

export function nombreSeguimiento(numero: number): string {
  const ordinal = ORDINALES[numero - 1];
  return ordinal ? `${ordinal} seguimiento` : `Seguimiento ${numero}`;
}

export const NOMBRE_RESULTADO_FINAL = "Validación de evidencia y evaluación del jefe";

// Junta y ordena por fecha de inicio (y de fin, si empiezan el mismo día).
export function armarCronograma(
  entrada: {
    actividades: Array<{ id: string; nombre: string; fechaInicio: Date; fechaFin: Date }>;
    seguimientos: Array<{ id: string; numero: number; fechaInicio: Date; fechaFin: Date }>;
    cumplimiento: { inicio: Date; fin: Date } | null;
  },
  hoy: string = hoyEnBogota(),
): ItemCronograma[] {
  const items: ItemCronograma[] = [
    ...entrada.actividades.map(
      (a): ItemCronograma => ({
        clave: `actividad-${a.id}`,
        tipo: "actividad",
        nombre: a.nombre,
        inicio: a.fechaInicio,
        fin: a.fechaFin,
        estado: estadoFranja(a.fechaInicio, a.fechaFin, hoy),
      }),
    ),
    ...entrada.seguimientos.map(
      (s): ItemCronograma => ({
        clave: `seguimiento-${s.id}`,
        tipo: "seguimiento",
        nombre: nombreSeguimiento(s.numero),
        inicio: s.fechaInicio,
        fin: s.fechaFin,
        estado: estadoFranja(s.fechaInicio, s.fechaFin, hoy),
      }),
    ),
  ];
  if (entrada.cumplimiento) {
    items.push({
      clave: "resultado-final",
      tipo: "resultado",
      nombre: NOMBRE_RESULTADO_FINAL,
      inicio: entrada.cumplimiento.inicio,
      fin: entrada.cumplimiento.fin,
      estado: estadoFranja(entrada.cumplimiento.inicio, entrada.cumplimiento.fin, hoy),
    });
  }
  return items.sort(
    (a, b) => fechaISO(a.inicio).localeCompare(fechaISO(b.inicio)) || fechaISO(a.fin).localeCompare(fechaISO(b.fin)),
  );
}

export async function obtenerCronograma(periodoId: string): Promise<ItemCronograma[]> {
  const periodo = await db.periodo.findUniqueOrThrow({
    where: { id: periodoId },
    select: {
      cumplimientoInicio: true,
      cumplimientoFin: true,
      seguimientos: { select: { id: true, numero: true, fechaInicio: true, fechaFin: true } },
      actividades: { select: { id: true, nombre: true, fechaInicio: true, fechaFin: true } },
    },
  });

  return armarCronograma({
    actividades: periodo.actividades,
    seguimientos: periodo.seguimientos,
    cumplimiento:
      periodo.cumplimientoInicio && periodo.cumplimientoFin
        ? { inicio: periodo.cumplimientoInicio, fin: periodo.cumplimientoFin }
        : null,
  });
}

// --- Administración de las actividades (Talento Humano / Admin) ---

function validarFechas(inicio: Date, fin: Date) {
  if (fechaISO(inicio) > fechaISO(fin)) {
    throw new ErrorPeriodo("La actividad termina antes de empezar.");
  }
}

export async function agregarActividad(input: { periodoId: string; nombre: string; fechaInicio: Date; fechaFin: Date }) {
  const periodo = await db.periodo.findUnique({ where: { id: input.periodoId } });
  if (!periodo) throw new ErrorPeriodo("El periodo no existe.");
  if (periodo.estado === "CERRADO") throw new ErrorPeriodo("No se puede cambiar el cronograma de un periodo cerrado.");
  validarFechas(input.fechaInicio, input.fechaFin);

  return db.actividadCronograma.create({
    data: { periodoId: input.periodoId, nombre: input.nombre, fechaInicio: input.fechaInicio, fechaFin: input.fechaFin },
  });
}

async function actividadEditableOFalla(actividadId: string) {
  const actividad = await db.actividadCronograma.findUnique({ where: { id: actividadId }, include: { periodo: true } });
  if (!actividad) throw new ErrorPeriodo("La actividad no existe.");
  if (actividad.periodo.estado === "CERRADO") {
    throw new ErrorPeriodo("No se puede cambiar el cronograma de un periodo cerrado.");
  }
  return actividad;
}

export async function editarActividad(input: { actividadId: string; nombre: string; fechaInicio: Date; fechaFin: Date }) {
  await actividadEditableOFalla(input.actividadId);
  validarFechas(input.fechaInicio, input.fechaFin);

  return db.actividadCronograma.update({
    where: { id: input.actividadId },
    data: { nombre: input.nombre, fechaInicio: input.fechaInicio, fechaFin: input.fechaFin },
  });
}

export async function eliminarActividad(actividadId: string) {
  await actividadEditableOFalla(actividadId);
  await db.actividadCronograma.delete({ where: { id: actividadId } });
}
