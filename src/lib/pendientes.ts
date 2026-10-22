// Lógica pura de "lo que te toca": tipos, prioridad y orden. Las consultas que
// deciden qué pendientes tiene cada persona viven en pendientes.service.ts.

export type PrioridadPendiente = "URGENTE" | "AHORA" | "PROXIMO";

// Sección de la app a la que pertenece el pendiente; sirve para el contador de
// la pestaña correspondiente.
export type AmbitoPendiente =
  | "mis-objetivos"
  | "indicadores"
  | "mi-equipo"
  | "mi-gerencia"
  | "administracion";

export interface Pendiente {
  id: string;
  prioridad: PrioridadPendiente;
  ambito: AmbitoPendiente;
  titulo: string;
  // El porqué, en una línea.
  detalle: string;
  // Cuánto tiempo hay: "hasta el 31 dic 2026 (quedan 3 días)". Opcional.
  limite: string | null;
  href: string;
  // Texto del botón: verbo concreto ("Aprobar objetivos"), no "Ver".
  accion: string;
  // False cuando solo informa (por ejemplo "esperando aprobación de tu jefe"):
  // se muestra, pero no suma al contador de la pestaña.
  cuenta: boolean;
}

const ORDEN: Record<PrioridadPendiente, number> = { URGENTE: 0, AHORA: 1, PROXIMO: 2 };

export function ordenarPendientes(pendientes: Pendiente[]): Pendiente[] {
  return [...pendientes].sort((a, b) => ORDEN[a.prioridad] - ORDEN[b.prioridad]);
}

// Una franja que termina en 3 días o menos es urgente; con más tiempo, "ahora".
export const DIAS_URGENTE = 3;

export function prioridadPorDias(dias: number): PrioridadPendiente {
  return dias <= DIAS_URGENTE ? "URGENTE" : "AHORA";
}

export function pluralizar(cantidad: number, singular: string, plural: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

// Cuántos pendientes que "cuentan" tiene cada sección, para el contador de las pestañas.
export function contarPorAmbito(pendientes: Pendiente[]): Partial<Record<AmbitoPendiente, number>> {
  const conteo: Partial<Record<AmbitoPendiente, number>> = {};
  for (const p of pendientes) {
    if (!p.cuenta) continue;
    conteo[p.ambito] = (conteo[p.ambito] ?? 0) + 1;
  }
  return conteo;
}
