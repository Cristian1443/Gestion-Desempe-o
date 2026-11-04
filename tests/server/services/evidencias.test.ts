import { describe, expect, it } from "vitest";
import { ventanaEvidencia } from "@/server/services/evidencias.service";

const dia = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const seg = (numero: number, inicio: string, fin: string) => ({
  id: `s${numero}`,
  numero,
  fechaInicio: dia(inicio),
  fechaFin: dia(fin),
});

describe("ventanaEvidencia (evidencias realizadas, solo antes de cada seguimiento)", () => {
  it("está abierta para el próximo seguimiento cuando ninguno está en curso", () => {
    const v = ventanaEvidencia({ seguimientoEnCurso: null, proximoSeguimiento: seg(1, "2026-11-17", "2026-11-20") });
    expect(v.abierta).toBe(true);
    if (v.abierta) expect(v.seguimiento.numero).toBe(1);
  });

  it("se cierra mientras un seguimiento está en curso, y dice cuál", () => {
    const v = ventanaEvidencia({
      seguimientoEnCurso: seg(1, "2026-11-17", "2026-11-20"),
      proximoSeguimiento: seg(2, "2027-03-01", "2027-03-05"),
    });
    expect(v.abierta).toBe(false);
    if (!v.abierta) expect(v.motivo).toContain("seguimiento 1");
  });

  it("se cierra cuando ya no quedan seguimientos", () => {
    const v = ventanaEvidencia({ seguimientoEnCurso: null, proximoSeguimiento: null });
    expect(v.abierta).toBe(false);
  });
});
