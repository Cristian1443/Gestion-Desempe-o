import { describe, expect, it } from "vitest";
import { UMBRAL_CUMPLE_CALIFICACION, cumpleCalificacion } from "@/lib/calificacion";

describe("cumpleCalificacion", () => {
  it("no cumple justo debajo del umbral", () => {
    expect(cumpleCalificacion(UMBRAL_CUMPLE_CALIFICACION - 1)).toBe(false);
  });

  it("cumple exactamente en el umbral", () => {
    expect(cumpleCalificacion(UMBRAL_CUMPLE_CALIFICACION)).toBe(true);
  });

  it("cumple por encima del umbral", () => {
    expect(cumpleCalificacion(100)).toBe(true);
  });

  it("no cumple con calificación 0", () => {
    expect(cumpleCalificacion(0)).toBe(false);
  });
});
