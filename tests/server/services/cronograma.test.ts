import { describe, expect, it } from "vitest";
import { armarCronograma, nombreSeguimiento } from "@/server/services/cronograma.service";

const dia = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const entrada = {
  actividades: [
    { id: "c", nombre: "Carga de evidencia", fechaInicio: dia("2027-01-01"), fechaFin: dia("2027-01-20") },
    { id: "a", nombre: "Cargar indicadores", fechaInicio: dia("2026-11-05"), fechaFin: dia("2026-11-11") },
    { id: "b", nombre: "Aprobación de jefes", fechaInicio: dia("2026-11-12"), fechaFin: dia("2026-11-13") },
  ],
  seguimientos: [{ id: "s1", numero: 1, fechaInicio: dia("2026-11-17"), fechaFin: dia("2026-11-20") }],
  cumplimiento: { inicio: dia("2027-01-21"), fin: dia("2027-01-30") },
};

describe("armarCronograma", () => {
  it("junta actividades, seguimientos y resultado final en orden de fecha", () => {
    const items = armarCronograma(entrada, "2026-11-04");
    expect(items.map((i) => i.nombre)).toEqual([
      "Cargar indicadores",
      "Aprobación de jefes",
      "Primer seguimiento",
      "Carga de evidencia",
      "Validación de evidencia y evaluación del jefe",
    ]);
  });

  it("marca el estado por la fecha de hoy, con inicio y fin inclusivos", () => {
    expect(armarCronograma(entrada, "2026-11-04").map((i) => i.estado)).toEqual([
      "PROXIMA", "PROXIMA", "PROXIMA", "PROXIMA", "PROXIMA",
    ]);
    expect(armarCronograma(entrada, "2026-11-11").map((i) => i.estado).slice(0, 2)).toEqual(["EN_CURSO", "PROXIMA"]);
    expect(armarCronograma(entrada, "2026-11-12").map((i) => i.estado).slice(0, 2)).toEqual(["FINALIZADA", "EN_CURSO"]);
    expect(armarCronograma(entrada, "2027-01-30").map((i) => i.estado).at(-1)).toBe("EN_CURSO");
    expect(armarCronograma(entrada, "2027-01-31").map((i) => i.estado).at(-1)).toBe("FINALIZADA");
  });

  it("no inventa el resultado final si no está definido", () => {
    const items = armarCronograma({ ...entrada, cumplimiento: null }, "2026-11-04");
    expect(items.some((i) => i.tipo === "resultado")).toBe(false);
  });

  it("nombra los seguimientos con ordinal", () => {
    expect(nombreSeguimiento(1)).toBe("Primer seguimiento");
    expect(nombreSeguimiento(2)).toBe("Segundo seguimiento");
    expect(nombreSeguimiento(11)).toBe("Seguimiento 11");
  });
});
