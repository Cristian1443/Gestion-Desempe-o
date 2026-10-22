// Franjas de fechas de los seguimientos y del % de cumplimiento final.
//
// Las fechas de franja son fechas de calendario guardadas como medianoche UTC
// (igual que en fecha.ts). Se comparan como texto "AAAA-MM-DD", que ordena
// igual que las fechas y evita desfases de zona horaria. Inicio y fin son
// inclusivos.

export type EstadoFranja = "PROXIMA" | "EN_CURSO" | "FINALIZADA";

// Colombia está en UTC-5 todo el año (no tiene horario de verano). El servidor
// corre en UTC, así que sin este ajuste, entre las 7 p. m. y la medianoche de
// Bogotá "hoy" ya sería el día siguiente.
const DESFASE_BOGOTA_MS = -5 * 60 * 60 * 1000;

export function hoyEnBogota(ahora: Date = new Date()): string {
  return new Date(ahora.getTime() + DESFASE_BOGOTA_MS).toISOString().slice(0, 10);
}

export function fechaISO(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

export function estadoFranja(inicio: Date, fin: Date, hoy: string): EstadoFranja {
  if (hoy < fechaISO(inicio)) return "PROXIMA";
  if (hoy > fechaISO(fin)) return "FINALIZADA";
  return "EN_CURSO";
}

export interface RangoFechas {
  inicio: Date;
  fin: Date;
}

export interface SeguimientoFranja extends RangoFechas {
  numero: number;
}

// Devuelve el primer problema de las franjas, o `null` si están bien. Reglas:
// cada franja con inicio <= fin; cada seguimiento dentro del periodo; los
// seguimientos en el mismo orden de su número y sin traslaparse; y la franja del
// % final después del último seguimiento (puede terminar después del periodo).
export function errorDeFranjas(input: {
  periodo: RangoFechas;
  seguimientos: SeguimientoFranja[];
  cumplimiento: RangoFechas | null;
}): string | null {
  const ordenados = [...input.seguimientos].sort((a, b) => a.numero - b.numero);

  for (const s of ordenados) {
    if (fechaISO(s.inicio) > fechaISO(s.fin)) {
      return `El seguimiento ${s.numero} termina antes de empezar.`;
    }
    if (fechaISO(s.inicio) < fechaISO(input.periodo.inicio) || fechaISO(s.fin) > fechaISO(input.periodo.fin)) {
      return `El seguimiento ${s.numero} debe estar dentro de las fechas del periodo.`;
    }
  }

  let anterior: SeguimientoFranja | null = null;
  for (const actual of ordenados) {
    if (anterior && fechaISO(actual.inicio) <= fechaISO(anterior.fin)) {
      return `El seguimiento ${actual.numero} debe empezar después de que termine el seguimiento ${anterior.numero}.`;
    }
    anterior = actual;
  }

  if (input.cumplimiento) {
    if (fechaISO(input.cumplimiento.inicio) > fechaISO(input.cumplimiento.fin)) {
      return "La franja del % de cumplimiento termina antes de empezar.";
    }
    const ultimo = ordenados[ordenados.length - 1];
    if (ultimo && fechaISO(input.cumplimiento.inicio) <= fechaISO(ultimo.fin)) {
      return `La franja del % de cumplimiento debe empezar después de que termine el seguimiento ${ultimo.numero}.`;
    }
  }

  return null;
}
