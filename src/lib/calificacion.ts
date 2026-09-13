// Umbral de aprobación de la calificación final (0-100) de un objetivo,
// compartido por los 3 niveles (individual, gerencia, corporativo). No
// afecta el cálculo de la nota ponderada (calculo-notas.ts) — es solo el
// criterio visual de "cumple/no cumple" que ve cada usuario.
export const UMBRAL_CUMPLE_CALIFICACION = 80;

export function cumpleCalificacion(calificacionFinal: number): boolean {
  return calificacionFinal >= UMBRAL_CUMPLE_CALIFICACION;
}
