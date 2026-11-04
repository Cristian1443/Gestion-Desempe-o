// Avance ponderado de las metas individuales: cada meta pesa una parte del total (hoy 25 de
// 100) y el % de avance que registra el jefe en cada seguimiento dice cuánto de esa parte
// lleva. Ej.: una meta de 25 con 60 % de avance aporta 15 puntos.

type ConSeguimientos = {
  peso?: number | null;
  seguimientos: Array<{ numero: number; porcentaje?: number | null }>;
};

// El % del último seguimiento que lo trae (el avance es acumulado: el más reciente manda).
export function ultimoPorcentaje(seguimientos: ConSeguimientos["seguimientos"]): number | null {
  const conPorcentaje = seguimientos
    .filter((s) => s.porcentaje !== null && s.porcentaje !== undefined)
    .sort((a, b) => a.numero - b.numero);
  return conPorcentaje.length === 0 ? null : (conPorcentaje[conPorcentaje.length - 1]!.porcentaje as number);
}

export function puntosDeAvance(peso: number, porcentaje: number): number {
  return Math.round(peso * porcentaje) / 100;
}

export interface AvancePonderado {
  // Puntos que suman las metas que ya tienen avance.
  puntos: number;
  // Puntos posibles (la suma de los pesos).
  total: number;
  // Cuántas metas ya tienen un % de avance registrado.
  conAvance: number;
}

export function avancePonderado(objetivos: ConSeguimientos[]): AvancePonderado {
  let puntos = 0;
  let total = 0;
  let conAvance = 0;
  for (const o of objetivos) {
    const peso = o.peso ?? 0;
    total += peso;
    const porcentaje = ultimoPorcentaje(o.seguimientos);
    if (porcentaje !== null) {
      puntos += puntosDeAvance(peso, porcentaje);
      conAvance += 1;
    }
  }
  return { puntos: Math.round(puntos * 100) / 100, total: Math.round(total * 100) / 100, conAvance };
}

// 15 → "15", 12.5 → "12,5": sin ceros de más.
export function formatearPuntos(n: number): string {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(n);
}
