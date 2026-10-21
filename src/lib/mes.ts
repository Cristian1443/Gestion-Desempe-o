// Meses de calendario de los indicadores de la empresa. Un mes se identifica
// con el texto "AAAA-MM" y se guarda como su primer día a medianoche UTC (igual
// que las demás fechas de calendario, ver fecha.ts). "Hoy" se toma en hora de
// Bogotá, no en la del servidor (ver franja.ts).

import { hoyEnBogota } from "./franja";

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const FORMATO_CLAVE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function esClaveMes(valor: string): boolean {
  return FORMATO_CLAVE.test(valor);
}

export function claveMes(fecha: Date): string {
  return fecha.toISOString().slice(0, 7);
}

export function primerDiaDelMes(clave: string): Date {
  if (!esClaveMes(clave)) throw new Error(`Mes inválido: "${clave}".`);
  return new Date(`${clave}-01T00:00:00.000Z`);
}

export function mesActual(hoy: string = hoyEnBogota()): string {
  return hoy.slice(0, 7);
}

// Todos los meses del periodo, desde el de su fecha de inicio hasta el de su
// fecha de fin, ya ordenados.
export function mesesDelPeriodo(inicio: Date, fin: Date): string[] {
  const claves: string[] = [];
  let anio = inicio.getUTCFullYear();
  let mes = inicio.getUTCMonth() + 1;
  const ultimo = claveMes(fin);

  for (;;) {
    const clave = `${anio}-${String(mes).padStart(2, "0")}`;
    if (clave > ultimo) break;
    claves.push(clave);
    mes += 1;
    if (mes > 12) {
      mes = 1;
      anio += 1;
    }
  }
  return claves;
}

// Los meses del periodo en los que ya se puede registrar: hasta el mes en
// curso, nunca los futuros.
export function mesesRegistrables(inicio: Date, fin: Date, hoy: string = hoyEnBogota()): string[] {
  const actual = mesActual(hoy);
  return mesesDelPeriodo(inicio, fin).filter((clave) => clave <= actual);
}

export function nombreMes(clave: string): string {
  return MESES[Number(clave.slice(5, 7)) - 1] ?? clave;
}

export function nombreMesCorto(clave: string): string {
  return nombreMes(clave).slice(0, 3);
}

// "octubre 2026"
export function etiquetaMes(clave: string): string {
  return `${nombreMes(clave)} ${clave.slice(0, 4)}`;
}
