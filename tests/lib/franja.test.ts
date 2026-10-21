import { describe, expect, it } from "vitest";
import { errorDeFranjas, estadoFranja, hoyEnBogota } from "@/lib/franja";

const dia = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("hoyEnBogota", () => {
  it("usa la fecha de Bogotá y no la de UTC entrada la noche", () => {
    // 2026-04-16 03:00 UTC son las 22:00 del 15 de abril en Bogotá.
    expect(hoyEnBogota(new Date("2026-04-16T03:00:00.000Z"))).toBe("2026-04-15");
  });

  it("cambia de día a medianoche de Bogotá", () => {
    expect(hoyEnBogota(new Date("2026-04-16T04:59:59.000Z"))).toBe("2026-04-15");
    expect(hoyEnBogota(new Date("2026-04-16T05:00:00.000Z"))).toBe("2026-04-16");
  });
});

describe("estadoFranja", () => {
  const inicio = dia("2026-04-01");
  const fin = dia("2026-04-15");

  it("es próxima antes del inicio", () => {
    expect(estadoFranja(inicio, fin, "2026-03-31")).toBe("PROXIMA");
  });

  it("incluye el primer y el último día", () => {
    expect(estadoFranja(inicio, fin, "2026-04-01")).toBe("EN_CURSO");
    expect(estadoFranja(inicio, fin, "2026-04-15")).toBe("EN_CURSO");
  });

  it("está finalizada después del fin", () => {
    expect(estadoFranja(inicio, fin, "2026-04-16")).toBe("FINALIZADA");
  });
});

describe("errorDeFranjas", () => {
  const periodo = { inicio: dia("2026-01-01"), fin: dia("2026-12-31") };
  const s1 = { numero: 1, inicio: dia("2026-03-16"), fin: dia("2026-03-31") };
  const s2 = { numero: 2, inicio: dia("2026-06-16"), fin: dia("2026-06-30") };
  const cumplimiento = { inicio: dia("2027-01-05"), fin: dia("2027-01-25") };

  it("acepta franjas en orden, sin traslape, y un % final que pasa del periodo", () => {
    expect(errorDeFranjas({ periodo, seguimientos: [s1, s2], cumplimiento })).toBeNull();
  });

  it("rechaza un seguimiento que termina antes de empezar", () => {
    const malo = { numero: 1, inicio: dia("2026-04-10"), fin: dia("2026-04-01") };
    expect(errorDeFranjas({ periodo, seguimientos: [malo], cumplimiento: null })).toMatch(/antes de empezar/);
  });

  it("rechaza un seguimiento fuera del periodo", () => {
    const fuera = { numero: 1, inicio: dia("2025-12-20"), fin: dia("2026-01-10") };
    expect(errorDeFranjas({ periodo, seguimientos: [fuera], cumplimiento: null })).toMatch(/dentro de las fechas del periodo/);
  });

  it("rechaza seguimientos que se traslapan, incluso por un solo día", () => {
    const traslapa = { numero: 2, inicio: dia("2026-03-31"), fin: dia("2026-04-10") };
    expect(errorDeFranjas({ periodo, seguimientos: [s1, traslapa], cumplimiento: null })).toMatch(/después de que termine el seguimiento 1/);
  });

  it("rechaza seguimientos que no siguen el orden de su número", () => {
    const antes = { numero: 2, inicio: dia("2026-01-10"), fin: dia("2026-01-20") };
    expect(errorDeFranjas({ periodo, seguimientos: [s1, antes], cumplimiento: null })).not.toBeNull();
  });

  it("rechaza un % final que empieza antes de terminar el último seguimiento", () => {
    const pronto = { inicio: dia("2026-06-30"), fin: dia("2026-07-10") };
    expect(errorDeFranjas({ periodo, seguimientos: [s1, s2], cumplimiento: pronto })).toMatch(/seguimiento 2/);
  });

  it("acepta un % final cuando todavía no hay seguimientos", () => {
    expect(errorDeFranjas({ periodo, seguimientos: [], cumplimiento })).toBeNull();
  });
});
