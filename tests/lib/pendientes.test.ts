import { describe, expect, it } from "vitest";
import { diasHasta, textoDias } from "@/lib/franja";
import {
  contarPorAmbito,
  ordenarPendientes,
  pluralizar,
  prioridadPorDias,
  type Pendiente,
} from "@/lib/pendientes";

function pendiente(parcial: Partial<Pendiente> & Pick<Pendiente, "id" | "prioridad">): Pendiente {
  return {
    ambito: "mis-objetivos",
    titulo: "t",
    detalle: "d",
    limite: null,
    href: "/x",
    accion: "Ir",
    cuenta: true,
    ...parcial,
  };
}

describe("ordenarPendientes", () => {
  it("pone primero lo urgente, luego lo de ahora y al final lo próximo, sin perder el orden interno", () => {
    const orden = ordenarPendientes([
      pendiente({ id: "a", prioridad: "PROXIMO" }),
      pendiente({ id: "b", prioridad: "AHORA" }),
      pendiente({ id: "c", prioridad: "URGENTE" }),
      pendiente({ id: "d", prioridad: "AHORA" }),
    ]);
    expect(orden.map((p) => p.id)).toEqual(["c", "b", "d", "a"]);
  });

  it("no modifica la lista original", () => {
    const original = [pendiente({ id: "a", prioridad: "PROXIMO" }), pendiente({ id: "b", prioridad: "URGENTE" })];
    ordenarPendientes(original);
    expect(original.map((p) => p.id)).toEqual(["a", "b"]);
  });
});

describe("prioridadPorDias", () => {
  it("es urgente cuando faltan 3 días o menos", () => {
    expect(prioridadPorDias(0)).toBe("URGENTE");
    expect(prioridadPorDias(3)).toBe("URGENTE");
    expect(prioridadPorDias(4)).toBe("AHORA");
  });
});

describe("contarPorAmbito", () => {
  it("suma solo los que cuentan y los separa por sección", () => {
    const conteo = contarPorAmbito([
      pendiente({ id: "1", prioridad: "AHORA", ambito: "mi-equipo" }),
      pendiente({ id: "2", prioridad: "AHORA", ambito: "mi-equipo" }),
      pendiente({ id: "3", prioridad: "PROXIMO", ambito: "mis-objetivos", cuenta: false }),
      pendiente({ id: "4", prioridad: "URGENTE", ambito: "indicadores" }),
    ]);
    expect(conteo).toEqual({ "mi-equipo": 2, indicadores: 1 });
  });
});

describe("pluralizar", () => {
  it("usa singular solo con 1", () => {
    expect(pluralizar(1, "objetivo", "objetivos")).toBe("1 objetivo");
    expect(pluralizar(0, "objetivo", "objetivos")).toBe("0 objetivos");
    expect(pluralizar(6, "objetivo", "objetivos")).toBe("6 objetivos");
  });
});

describe("diasHasta y textoDias", () => {
  const fin = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

  it("cuenta días de calendario hasta el fin de la franja", () => {
    expect(diasHasta(fin("2026-10-31"), "2026-10-21")).toBe(10);
    expect(diasHasta(fin("2026-10-21"), "2026-10-21")).toBe(0);
    expect(diasHasta(fin("2026-10-20"), "2026-10-21")).toBe(-1);
  });

  it("redacta los días que quedan", () => {
    expect(textoDias(0)).toBe("termina hoy");
    expect(textoDias(1)).toBe("queda 1 día");
    expect(textoDias(12)).toBe("quedan 12 días");
  });
});
