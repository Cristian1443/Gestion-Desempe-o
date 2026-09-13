import { describe, expect, it } from "vitest";
import {
  ErrorEvaluacionIncompleta,
  ErrorValidacionObjetivos,
  calcularEvaluacion,
  calcularNotaFinal,
  calcularPonderadoNivel,
  distribuirPesoEquitativo,
  validarObjetivosCorporativos,
  validarObjetivosGerencia,
  validarObjetivosIndividuales,
  type ObjetivoCalculable,
  type ObjetivoIndividualCalculable,
} from "@/server/services/calculo-notas";

function objetivo(
  id: string,
  peso: number,
  calificacionFinal: number | null,
): ObjetivoCalculable {
  return { id, peso, calificacionFinal };
}

function objetivoIndividual(
  id: string,
  tipoIndividual: "DESEMPENO" | "DESARROLLO",
  peso: number,
  calificacionFinal: number | null,
): ObjetivoIndividualCalculable {
  return { id, tipoIndividual, peso, calificacionFinal };
}

// 4 de desempeño (suman 40) + 2 de desarrollo (sin peso, no entran al
// cálculo), el caso válido estándar que reutilizan varios tests de este
// archivo.
function individualesValidos(
  calificaciones: { desempeno: number[]; desarrollo: number[] } = {
    desempeno: [90, 80, 70, 100],
    desarrollo: [85, 95],
  },
): ObjetivoIndividualCalculable[] {
  return [
    objetivoIndividual("d1", "DESEMPENO", 10, calificaciones.desempeno[0] ?? null),
    objetivoIndividual("d2", "DESEMPENO", 10, calificaciones.desempeno[1] ?? null),
    objetivoIndividual("d3", "DESEMPENO", 10, calificaciones.desempeno[2] ?? null),
    objetivoIndividual("d4", "DESEMPENO", 10, calificaciones.desempeno[3] ?? null),
    objetivoIndividual("r1", "DESARROLLO", 0, calificaciones.desarrollo[0] ?? null),
    objetivoIndividual("r2", "DESARROLLO", 0, calificaciones.desarrollo[1] ?? null),
  ];
}

describe("calcularPonderadoNivel", () => {
  it("calcula el promedio ponderado normalizado con pesos distintos", () => {
    const objetivos = [
      objetivo("1", 40, 90),
      objetivo("2", 30, 80),
      objetivo("3", 20, 70),
      objetivo("4", 10, 100),
    ];
    // (40*90 + 30*80 + 20*70 + 10*100) / 100 = 84
    expect(calcularPonderadoNivel(objetivos)).toBe(84);
  });

  it("da el mismo resultado que un promedio simple cuando los pesos son iguales (gerencia)", () => {
    const objetivos = [objetivo("g1", 15, 90), objetivo("g2", 15, 70)];
    expect(calcularPonderadoNivel(objetivos)).toBe(80);
  });

  it("da el mismo resultado que un promedio simple cuando los pesos son iguales (corporativo)", () => {
    const objetivos = Array.from({ length: 8 }, (_, i) => objetivo(`c${i}`, 3.75, 80));
    expect(calcularPonderadoNivel(objetivos)).toBe(80);
  });

  it("redondea el resultado a 2 decimales", () => {
    const objetivos = [objetivo("1", 33.33, 100), objetivo("2", 33.33, 0), objetivo("3", 33.34, 50)];
    // (33.33*100 + 33.33*0 + 33.34*50) / 100 = (3333 + 0 + 1667) / 100 = 50.00
    expect(calcularPonderadoNivel(objetivos)).toBe(50);
  });

  it("lanza ErrorEvaluacionIncompleta si algún objetivo no tiene calificación final", () => {
    const objetivos = [objetivo("1", 50, 90), objetivo("2", 50, null)];
    expect(() => calcularPonderadoNivel(objetivos)).toThrow(ErrorEvaluacionIncompleta);
  });

  it("lanza ErrorValidacionObjetivos si la lista está vacía", () => {
    expect(() => calcularPonderadoNivel([])).toThrow(ErrorValidacionObjetivos);
  });
});

describe("calcularNotaFinal", () => {
  it("combina los 3 niveles con los pesos 0.40 / 0.30 / 0.30", () => {
    const resultado = calcularNotaFinal({
      notaIndividual: 90,
      notaGerencia: 80,
      notaCorporativa: 70,
    });
    // 90*0.4 + 80*0.3 + 70*0.3 = 36 + 24 + 21 = 81
    expect(resultado).toBe(81);
  });

  it("devuelve 100 cuando los 3 niveles son perfectos", () => {
    const resultado = calcularNotaFinal({
      notaIndividual: 100,
      notaGerencia: 100,
      notaCorporativa: 100,
    });
    expect(resultado).toBe(100);
  });
});

describe("validarObjetivosIndividuales", () => {
  it("acepta exactamente 4 objetivos de desempeño (suman 40) y 2 de desarrollo (sin peso)", () => {
    expect(() => validarObjetivosIndividuales(individualesValidos())).not.toThrow();
  });

  it("rechaza menos de 4 objetivos de desempeño", () => {
    const objetivos = [
      objetivoIndividual("d1", "DESEMPENO", 10, null),
      objetivoIndividual("d2", "DESEMPENO", 10, null),
      objetivoIndividual("d3", "DESEMPENO", 10, null),
      objetivoIndividual("r1", "DESARROLLO", 0, null),
      objetivoIndividual("r2", "DESARROLLO", 0, null),
    ];
    expect(() => validarObjetivosIndividuales(objetivos)).toThrow(ErrorValidacionObjetivos);
  });

  it("rechaza una cantidad de objetivos de desarrollo distinta de 2", () => {
    const objetivos = [
      ...individualesValidos().filter((o) => o.tipoIndividual === "DESEMPENO"),
      objetivoIndividual("r1", "DESARROLLO", 0, null),
    ];
    expect(() => validarObjetivosIndividuales(objetivos)).toThrow(ErrorValidacionObjetivos);
  });

  it("rechaza si la suma de pesos de desempeño no es exactamente 40", () => {
    const objetivos = [
      objetivoIndividual("d1", "DESEMPENO", 10, null),
      objetivoIndividual("d2", "DESEMPENO", 10, null),
      objetivoIndividual("d3", "DESEMPENO", 10, null),
      objetivoIndividual("d4", "DESEMPENO", 5, null), // suma 35, no 40
      objetivoIndividual("r1", "DESARROLLO", 0, null),
      objetivoIndividual("r2", "DESARROLLO", 0, null),
    ];
    expect(() => validarObjetivosIndividuales(objetivos)).toThrow(ErrorValidacionObjetivos);
  });

  it("no valida el peso de los objetivos de desarrollo (no aplica)", () => {
    const objetivos = [
      ...individualesValidos().filter((o) => o.tipoIndividual === "DESEMPENO"),
      objetivoIndividual("r1", "DESARROLLO", 5, null),
      objetivoIndividual("r2", "DESARROLLO", 3, null),
    ];
    expect(() => validarObjetivosIndividuales(objetivos)).not.toThrow();
  });

  it("acepta sumas con imprecisión de punto flotante típica de JS", () => {
    // 10 + 10 + 10.01 - 0.01 en punto flotante nativo de JS no siempre da 40 exacto.
    const objetivos = [
      objetivoIndividual("d1", "DESEMPENO", 9.99, null),
      objetivoIndividual("d2", "DESEMPENO", 9.99, null),
      objetivoIndividual("d3", "DESEMPENO", 9.99, null),
      objetivoIndividual("d4", "DESEMPENO", 10.03, null),
      objetivoIndividual("r1", "DESARROLLO", 0, null),
      objetivoIndividual("r2", "DESARROLLO", 0, null),
    ];
    expect(() => validarObjetivosIndividuales(objetivos)).not.toThrow();
  });
});

describe("validarObjetivosGerencia", () => {
  it("acepta exactamente 2 objetivos de 15 cada uno", () => {
    const objetivos = [objetivo("1", 15, null), objetivo("2", 15, null)];
    expect(() => validarObjetivosGerencia(objetivos)).not.toThrow();
  });

  it("rechaza una cantidad distinta de 2", () => {
    const objetivos = [objetivo("1", 15, null), objetivo("2", 15, null), objetivo("3", 15, null)];
    expect(() => validarObjetivosGerencia(objetivos)).toThrow(ErrorValidacionObjetivos);
  });

  it("rechaza si algún peso no es 15", () => {
    const objetivos = [objetivo("1", 15, null), objetivo("2", 20, null)];
    expect(() => validarObjetivosGerencia(objetivos)).toThrow(ErrorValidacionObjetivos);
  });
});

describe("validarObjetivosCorporativos", () => {
  it("acepta exactamente 8 objetivos de 3.75 cada uno", () => {
    const objetivos = Array.from({ length: 8 }, (_, i) => objetivo(`${i}`, 3.75, null));
    expect(() => validarObjetivosCorporativos(objetivos)).not.toThrow();
  });

  it("rechaza una cantidad distinta de 8", () => {
    const objetivos = Array.from({ length: 7 }, (_, i) => objetivo(`${i}`, 3.75, null));
    expect(() => validarObjetivosCorporativos(objetivos)).toThrow(ErrorValidacionObjetivos);
  });

  it("rechaza si algún peso no es 3.75", () => {
    const objetivos = Array.from({ length: 8 }, (_, i) => objetivo(`${i}`, i === 0 ? 4 : 3.75, null));
    expect(() => validarObjetivosCorporativos(objetivos)).toThrow(ErrorValidacionObjetivos);
  });
});

describe("distribuirPesoEquitativo", () => {
  it("reparte 30 entre los 4 objetivos de desempeño en partes iguales", () => {
    expect(distribuirPesoEquitativo(4, 30)).toEqual([7.5, 7.5, 7.5, 7.5]);
  });

  it("reparte 10 entre los 2 objetivos de desarrollo en partes iguales", () => {
    expect(distribuirPesoEquitativo(2, 10)).toEqual([5, 5]);
  });

  it("reparte 100 entre 3 objetivos absorbiendo el residuo en el último", () => {
    const pesos = distribuirPesoEquitativo(3, 100);
    expect(pesos).toEqual([33.33, 33.33, 33.34]);
    expect(pesos.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
  });

  it("la suma siempre da exactamente el total pedido en centésimos, para cualquier cantidad", () => {
    for (let cantidad = 1; cantidad <= 20; cantidad++) {
      const pesos = distribuirPesoEquitativo(cantidad, 30);
      const sumaCentesimos = pesos.reduce((acc, p) => acc + Math.round(p * 100), 0);
      expect(sumaCentesimos).toBe(3000);
    }
  });

  it("rechaza cantidades inválidas", () => {
    expect(() => distribuirPesoEquitativo(0, 30)).toThrow(ErrorValidacionObjetivos);
    expect(() => distribuirPesoEquitativo(-1, 30)).toThrow(ErrorValidacionObjetivos);
  });
});

describe("calcularEvaluacion (orquestador completo)", () => {
  const individuales = individualesValidos(); // desempeño 90/80/70/100 (x10), desarrollo sin peso
  const gerencia = [objetivo("g1", 15, 85), objetivo("g2", 15, 95)];
  const corporativos = Array.from({ length: 8 }, (_, i) => objetivo(`c${i}`, 3.75, 75));

  it("calcula los 3 niveles y la nota final en un solo llamado", () => {
    const resultado = calcularEvaluacion({ individuales, gerencia, corporativos });

    // (10*90 + 10*80 + 10*70 + 10*100) / 40 = 85 — desarrollo no entra al cálculo
    expect(resultado.notaIndividual).toBe(85);
    expect(resultado.notaGerencia).toBe(90); // (85+95)/2
    expect(resultado.notaCorporativa).toBe(75);
    // 85*0.4 + 90*0.3 + 75*0.3 = 34 + 27 + 22.5 = 83.5
    expect(resultado.notaFinal).toBe(83.5);
  });

  it("propaga el error si algún nivel no cumple sus reglas de pesos/cantidad", () => {
    const gerenciaInvalida = [objetivo("g1", 15, 85)]; // falta un objetivo
    expect(() =>
      calcularEvaluacion({ individuales, gerencia: gerenciaInvalida, corporativos }),
    ).toThrow(ErrorValidacionObjetivos);
  });

  it("propaga el error si falta calificar algún objetivo de desempeño", () => {
    const individualesIncompletos = individualesValidos({
      desempeno: [90, 80, 70],
      desarrollo: [85, 95],
    });
    expect(() =>
      calcularEvaluacion({ individuales: individualesIncompletos, gerencia, corporativos }),
    ).toThrow(ErrorEvaluacionIncompleta);
  });

  it("no exige calificación de los objetivos de desarrollo para calcular la nota", () => {
    const sinCalificarDesarrollo = individualesValidos({
      desempeno: [90, 80, 70, 100],
      desarrollo: [],
    });
    expect(() =>
      calcularEvaluacion({ individuales: sinCalificarDesarrollo, gerencia, corporativos }),
    ).not.toThrow();
  });
});
