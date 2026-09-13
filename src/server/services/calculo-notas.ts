// Motor de cálculo de notas — única fuente de verdad para la fórmula de
// evaluación. No debe existir ninguna otra implementación de esta fórmula
// en el frontend ni en otro servicio: todo cálculo de nota pasa por aquí.
//
// Fórmula:
//   nota_final = ponderado_individual * 0.40
//              + ponderado_gerencia   * 0.30
//              + ponderado_corporativo * 0.30
//
// Cada "ponderado_nivel" es un promedio ponderado normalizado dentro del
// nivel: Σ(peso_i / Σpeso_nivel * calificacion_i). Esta misma fórmula sirve
// para los tres niveles porque la normalización interna hace irrelevante el
// total exacto de cada uno — lo que importa es la proporción entre pesos:
//   - INDIVIDUAL: los 4 objetivos de DESEMPEÑO suman el 40 completo del
//     nivel. Los 2 de DESARROLLO no llevan peso ni entran a este cálculo —
//     el jefe solo registra si se cumplieron o no (sí/no) como parte de la
//     calificación final, de forma informativa, sin afectar la nota.
//   - GERENCIA: 2 objetivos de 15 cada uno.
//   - CORPORATIVO: 8 objetivos de 3.75 cada uno.

export interface ObjetivoCalculable {
  id: string;
  peso: number; // porcentaje, ej. 25, 15, 3.75
  calificacionFinal: number | null; // 0-100, null si aún no se ha calificado
}

export interface ObjetivoIndividualCalculable extends ObjetivoCalculable {
  tipoIndividual: "DESEMPENO" | "DESARROLLO";
}

export interface ObjetivosPorNivel {
  individuales: ObjetivoIndividualCalculable[];
  gerencia: ObjetivoCalculable[];
  corporativos: ObjetivoCalculable[];
}

export interface ResultadoEvaluacion {
  notaIndividual: number;
  notaGerencia: number;
  notaCorporativa: number;
  notaFinal: number;
}

export const PESO_NIVEL_INDIVIDUAL = 0.4;
export const PESO_NIVEL_GERENCIA = 0.3;
export const PESO_NIVEL_CORPORATIVO = 0.3;

export const CANTIDAD_OBJETIVOS_DESEMPENO = 4;
export const PESO_TOTAL_DESEMPENO = 40;

// Los objetivos de desarrollo no llevan peso: se registran (2 por
// colaborador) pero no compiten por porcentaje dentro del nivel individual.
export const CANTIDAD_OBJETIVOS_DESARROLLO = 2;

export const CANTIDAD_OBJETIVOS_GERENCIA = 2;
export const PESO_OBJETIVO_GERENCIA = 15;

export const CANTIDAD_OBJETIVOS_CORPORATIVOS = 8;
export const PESO_OBJETIVO_CORPORATIVO = 3.75;

export class ErrorValidacionObjetivos extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErrorValidacionObjetivos";
  }
}

export class ErrorEvaluacionIncompleta extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErrorEvaluacionIncompleta";
  }
}

// Suma valores con precisión de 2 decimales usando aritmética entera
// (centésimos), evitando errores de redondeo de punto flotante como
// 33.33 + 33.33 + 33.34 !== 100 en JS.
function sumaEnCentesimos(valores: number[]): number {
  return valores.reduce((acumulado, valor) => acumulado + Math.round(valor * 100), 0);
}

function redondear(valor: number, decimales = 2): number {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

export function validarObjetivosIndividuales(objetivos: ObjetivoIndividualCalculable[]): void {
  const desempeno = objetivos.filter((o) => o.tipoIndividual === "DESEMPENO");
  const desarrollo = objetivos.filter((o) => o.tipoIndividual === "DESARROLLO");

  if (desempeno.length !== CANTIDAD_OBJETIVOS_DESEMPENO) {
    throw new ErrorValidacionObjetivos(
      `Se requieren exactamente ${CANTIDAD_OBJETIVOS_DESEMPENO} objetivos de desempeño, se recibieron ${desempeno.length}.`,
    );
  }
  if (desarrollo.length !== CANTIDAD_OBJETIVOS_DESARROLLO) {
    throw new ErrorValidacionObjetivos(
      `Se requieren exactamente ${CANTIDAD_OBJETIVOS_DESARROLLO} objetivos de desarrollo, se recibieron ${desarrollo.length}.`,
    );
  }

  const sumaDesempenoCentesimos = sumaEnCentesimos(desempeno.map((o) => o.peso));
  const esperadoDesempenoCentesimos = Math.round(PESO_TOTAL_DESEMPENO * 100);
  if (sumaDesempenoCentesimos !== esperadoDesempenoCentesimos) {
    throw new ErrorValidacionObjetivos(
      `La suma de pesos de los objetivos de desempeño debe ser ${PESO_TOTAL_DESEMPENO}, es ${
        sumaDesempenoCentesimos / 100
      }.`,
    );
  }
}

export function validarObjetivosGerencia(objetivos: ObjetivoCalculable[]): void {
  if (objetivos.length !== CANTIDAD_OBJETIVOS_GERENCIA) {
    throw new ErrorValidacionObjetivos(
      `Se requieren exactamente ${CANTIDAD_OBJETIVOS_GERENCIA} objetivos de gerencia, se recibieron ${objetivos.length}.`,
    );
  }

  const pesoEsperadoCentesimos = Math.round(PESO_OBJETIVO_GERENCIA * 100);
  const invalido = objetivos.find((o) => Math.round(o.peso * 100) !== pesoEsperadoCentesimos);
  if (invalido) {
    throw new ErrorValidacionObjetivos(
      `Cada objetivo de gerencia debe tener un peso de ${PESO_OBJETIVO_GERENCIA}, el objetivo "${invalido.id}" tiene ${invalido.peso}.`,
    );
  }
}

export function validarObjetivosCorporativos(objetivos: ObjetivoCalculable[]): void {
  if (objetivos.length !== CANTIDAD_OBJETIVOS_CORPORATIVOS) {
    throw new ErrorValidacionObjetivos(
      `Se requieren exactamente ${CANTIDAD_OBJETIVOS_CORPORATIVOS} objetivos corporativos, se recibieron ${objetivos.length}.`,
    );
  }

  const pesoEsperadoCentesimos = Math.round(PESO_OBJETIVO_CORPORATIVO * 100);
  const invalido = objetivos.find((o) => Math.round(o.peso * 100) !== pesoEsperadoCentesimos);
  if (invalido) {
    throw new ErrorValidacionObjetivos(
      `Cada objetivo corporativo debe tener un peso de ${PESO_OBJETIVO_CORPORATIVO}, el objetivo "${invalido.id}" tiene ${invalido.peso}.`,
    );
  }
}

// Promedio ponderado normalizado de un nivel. Requiere que todos los
// objetivos ya tengan calificación final; si falta alguna, la evaluación no
// puede cerrarse todavía.
export function calcularPonderadoNivel(objetivos: ObjetivoCalculable[]): number {
  if (objetivos.length === 0) {
    throw new ErrorValidacionObjetivos("No hay objetivos para calcular el ponderado del nivel.");
  }

  const sinCalificar = objetivos.filter((o) => o.calificacionFinal === null);
  if (sinCalificar.length > 0) {
    throw new ErrorEvaluacionIncompleta(
      `Faltan ${sinCalificar.length} objetivo(s) por calificar: ${sinCalificar
        .map((o) => o.id)
        .join(", ")}.`,
    );
  }

  const pesoTotalCentesimos = sumaEnCentesimos(objetivos.map((o) => o.peso));
  if (pesoTotalCentesimos === 0) {
    throw new ErrorValidacionObjetivos("La suma de pesos del nivel no puede ser 0.");
  }
  const pesoTotal = pesoTotalCentesimos / 100;

  const acumulado = objetivos.reduce(
    (acumulado, o) => acumulado + (o.peso / pesoTotal) * (o.calificacionFinal as number),
    0,
  );

  return redondear(acumulado);
}

export function calcularNotaFinal(input: {
  notaIndividual: number;
  notaGerencia: number;
  notaCorporativa: number;
}): number {
  const final =
    input.notaIndividual * PESO_NIVEL_INDIVIDUAL +
    input.notaGerencia * PESO_NIVEL_GERENCIA +
    input.notaCorporativa * PESO_NIVEL_CORPORATIVO;

  return redondear(final);
}

// Orquesta validación + cálculo de los 3 niveles y la nota final. Es la
// función que deben llamar los servicios de evaluación / cierre de periodo.
export function calcularEvaluacion(objetivos: ObjetivosPorNivel): ResultadoEvaluacion {
  validarObjetivosIndividuales(objetivos.individuales);
  validarObjetivosGerencia(objetivos.gerencia);
  validarObjetivosCorporativos(objetivos.corporativos);

  // Los objetivos de DESARROLLO no tienen peso y no entran al ponderado — su
  // cumplimiento (sí/no) se registra aparte, sin afectar la nota individual.
  const notaIndividual = calcularPonderadoNivel(
    objetivos.individuales.filter((o) => o.tipoIndividual === "DESEMPENO"),
  );
  const notaGerencia = calcularPonderadoNivel(objetivos.gerencia);
  const notaCorporativa = calcularPonderadoNivel(objetivos.corporativos);
  const notaFinal = calcularNotaFinal({ notaIndividual, notaGerencia, notaCorporativa });

  return { notaIndividual, notaGerencia, notaCorporativa, notaFinal };
}

// Atajo de UI: "distribuir equitativamente" un total de peso entre N
// objetivos (ej. 30 entre los 4 de desempeño, o 10 entre los 2 de
// desarrollo). Reparte en centésimos y asigna el residuo de redondeo a los
// últimos objetivos, para que la suma dé exactamente el total pedido.
export function distribuirPesoEquitativo(cantidad: number, total: number): number[] {
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    throw new ErrorValidacionObjetivos("La cantidad de objetivos debe ser un entero mayor a 0.");
  }

  const totalCentesimos = Math.round(total * 100);
  const baseCentesimos = Math.floor(totalCentesimos / cantidad);
  const residuo = totalCentesimos - baseCentesimos * cantidad;

  const pesosCentesimos = new Array(cantidad).fill(baseCentesimos);
  for (let i = 0; i < residuo; i++) {
    pesosCentesimos[pesosCentesimos.length - 1 - i] += 1;
  }

  return pesosCentesimos.map((c) => c / 100);
}
