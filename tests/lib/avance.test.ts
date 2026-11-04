import { describe, expect, it } from "vitest";
import { avancePonderado, formatearPuntos, puntosDeAvance, ultimoPorcentaje } from "@/lib/avance";

describe("avance ponderado de las metas individuales (25 % cada una, sobre 100)", () => {
  it("una meta de 25 con 60 % de avance aporta 15 puntos", () => {
    expect(puntosDeAvance(25, 60)).toBe(15);
    expect(puntosDeAvance(25, 100)).toBe(25);
    expect(puntosDeAvance(25, 0)).toBe(0);
    expect(puntosDeAvance(25, 33)).toBe(8.25);
  });

  it("el avance es acumulado: manda el último seguimiento que trae porcentaje", () => {
    expect(
      ultimoPorcentaje([
        { numero: 2, porcentaje: 70 },
        { numero: 1, porcentaje: 30 },
        { numero: 3, porcentaje: null },
      ]),
    ).toBe(70);
    expect(ultimoPorcentaje([])).toBeNull();
  });

  it("suma los puntos de las metas que ya tienen avance, sobre el total de pesos", () => {
    const r = avancePonderado([
      { peso: 25, seguimientos: [{ numero: 1, porcentaje: 80 }] },
      { peso: 25, seguimientos: [{ numero: 1, porcentaje: 40 }] },
      { peso: 25, seguimientos: [] },
      { peso: 25, seguimientos: [{ numero: 1, porcentaje: 100 }] },
    ]);
    expect(r).toEqual({ puntos: 55, total: 100, conAvance: 3 });
  });

  it("formatea sin ceros de más", () => {
    expect(formatearPuntos(15)).toBe("15");
    expect(formatearPuntos(8.25)).toBe("8,25");
  });
});
