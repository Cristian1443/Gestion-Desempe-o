import { describe, expect, it } from "vitest";
import {
  claveMes,
  esClaveMes,
  etiquetaMes,
  mesActual,
  mesesDelPeriodo,
  mesesRegistrables,
  nombreMesCorto,
  primerDiaDelMes,
} from "@/lib/mes";

const dia = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("mes", () => {
  it("valida el formato AAAA-MM", () => {
    expect(esClaveMes("2026-10")).toBe(true);
    expect(esClaveMes("2026-13")).toBe(false);
    expect(esClaveMes("2026-00")).toBe(false);
    expect(esClaveMes("26-10")).toBe(false);
    expect(esClaveMes("2026-10-01")).toBe(false);
  });

  it("convierte entre fecha y clave de mes", () => {
    expect(claveMes(dia("2026-10-21"))).toBe("2026-10");
    expect(primerDiaDelMes("2026-10").toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(() => primerDiaDelMes("2026-99")).toThrow(/inválido/);
  });

  it("toma el mes de hoy en hora de Bogotá, no en UTC", () => {
    // 2026-11-01 03:00 UTC son las 22:00 del 31 de octubre en Bogotá.
    expect(mesActual("2026-10-31")).toBe("2026-10");
    expect(mesActual("2026-11-01")).toBe("2026-11");
  });

  it("lista los 12 meses de un periodo anual", () => {
    const meses = mesesDelPeriodo(dia("2026-01-01"), dia("2026-12-31"));
    expect(meses).toHaveLength(12);
    expect(meses[0]).toBe("2026-01");
    expect(meses[11]).toBe("2026-12");
  });

  it("cruza el cambio de año en un periodo que no empieza en enero", () => {
    expect(mesesDelPeriodo(dia("2026-11-15"), dia("2027-02-10"))).toEqual([
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
    ]);
  });

  it("solo permite registrar hasta el mes en curso, nunca meses futuros", () => {
    const registrables = mesesRegistrables(dia("2026-01-01"), dia("2026-12-31"), "2026-10-21");
    expect(registrables).toHaveLength(10);
    expect(registrables[9]).toBe("2026-10");
    expect(registrables).not.toContain("2026-11");
  });

  it("no ofrece ningún mes si el periodo todavía no empieza", () => {
    expect(mesesRegistrables(dia("2027-01-01"), dia("2027-12-31"), "2026-10-21")).toEqual([]);
  });

  it("da etiquetas en español", () => {
    expect(etiquetaMes("2026-10")).toBe("octubre 2026");
    expect(nombreMesCorto("2026-09")).toBe("sep");
  });
});
