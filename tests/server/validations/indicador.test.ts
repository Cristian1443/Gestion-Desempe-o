import { describe, expect, it } from "vitest";
import { CODIGOS_LINEA_INDICADOR, textoLinea } from "@/lib/indicadores-config";
import { crearIndicadorSchema } from "@/server/validations/indicador.schema";

const valido = {
  lineaEstrategica: "L1",
  descripcion: "Facilitar proyectos de inversión.",
  tipoIndicador: "ESTRATEGICO",
  titulo: "# Proyectos facilitados",
  meta: "47",
};

describe("campos de un indicador", () => {
  it("las líneas disponibles son L1 a L4, sin la L5 transversal", () => {
    expect([...CODIGOS_LINEA_INDICADOR]).toEqual(["L1", "L2", "L3", "L4"]);
    expect(textoLinea("L1")).toContain("Facilitar la inversión extranjera");
    expect(textoLinea(null)).toBeNull();
  });

  it("acepta los cinco campos (la meta puede ser N/A)", () => {
    expect(crearIndicadorSchema.safeParse(valido).success).toBe(true);
    expect(crearIndicadorSchema.safeParse({ ...valido, meta: "N/A", tipoIndicador: "GESTION" }).success).toBe(true);
  });

  it("rechaza la línea L5, una línea vacía y un tipo desconocido", () => {
    expect(crearIndicadorSchema.safeParse({ ...valido, lineaEstrategica: "L5" }).success).toBe(false);
    expect(crearIndicadorSchema.safeParse({ ...valido, lineaEstrategica: "" }).success).toBe(false);
    expect(crearIndicadorSchema.safeParse({ ...valido, tipoIndicador: "OTRO" }).success).toBe(false);
  });

  it("pide el objetivo estratégico, el indicador y la meta", () => {
    for (const campo of ["descripcion", "titulo", "meta"] as const) {
      expect(crearIndicadorSchema.safeParse({ ...valido, [campo]: "" }).success).toBe(false);
    }
  });
});
