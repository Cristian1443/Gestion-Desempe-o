import { describe, expect, it } from "vitest";
import { DESARROLLO_HABILITADO, PESO_TOTAL_INDIVIDUALES } from "@/lib/objetivos-config";
import { resumirResultados } from "@/server/services/consolidado.service";
import { proponerObjetivosSchema } from "@/server/validations/aprobacion.schema";

function desempeno(pesos: number[]) {
  return pesos.map((peso) => ({
    tipoIndividual: "DESEMPENO" as const,
    descripcion: "Concretar proyectos de inversión",
    acciones: "Campañas internacionales",
    indicador: "Proyectos concretados / proyectos planeados",
    meta: "47",
    peso,
    lineaEstrategica: "L1" as const,
  }));
}

const desarrollo = {
  tipoIndividual: "DESARROLLO" as const,
  descripcion: "Fortalecer liderazgo",
  acciones: "Curso",
  indicador: "Horas de formación",
  competencia: "Liderazgo",
};

describe("propuesta de objetivos individuales (con peso, sin desarrollo este año)", () => {
  it("el desarrollo está desactivado y los cuatro pesos suman 100", () => {
    expect(DESARROLLO_HABILITADO).toBe(false);
    expect(PESO_TOTAL_INDIVIDUALES).toBe(100);
  });

  it("acepta 4 objetivos de desempeño con meta y pesos que suman 100", () => {
    expect(proponerObjetivosSchema.safeParse({ objetivos: desempeno([25, 25, 25, 25]) }).success).toBe(true);
    expect(proponerObjetivosSchema.safeParse({ objetivos: desempeno([40, 30, 20, 10]) }).success).toBe(true);
    // Con decimales, sin errores de redondeo de punto flotante.
    expect(proponerObjetivosSchema.safeParse({ objetivos: desempeno([33.33, 33.33, 33.33, 0.01]) }).success).toBe(true);
  });

  it("rechaza pesos que no suman 100 (ni de más ni de menos)", () => {
    const menos = proponerObjetivosSchema.safeParse({ objetivos: desempeno([25, 25, 25, 24]) });
    expect(menos.success).toBe(false);
    if (!menos.success) expect(menos.error.issues[0]?.message).toContain("100");
    expect(proponerObjetivosSchema.safeParse({ objetivos: desempeno([30, 30, 30, 30]) }).success).toBe(false);
  });

  it("rechaza un peso en cero y una meta vacía", () => {
    expect(proponerObjetivosSchema.safeParse({ objetivos: desempeno([50, 50, 0, 0]) }).success).toBe(false);
    const sinMeta = desempeno([25, 25, 25, 25]).map((o, i) => (i === 0 ? { ...o, meta: "" } : o));
    expect(proponerObjetivosSchema.safeParse({ objetivos: sinMeta }).success).toBe(false);
  });

  it("rechaza menos o más de 4 de desempeño", () => {
    expect(proponerObjetivosSchema.safeParse({ objetivos: desempeno([50, 25, 25]) }).success).toBe(false);
    expect(proponerObjetivosSchema.safeParse({ objetivos: desempeno([20, 20, 20, 20, 20]) }).success).toBe(false);
  });

  it("rechaza objetivos de desarrollo mientras estén desactivados, con un mensaje claro", () => {
    const resultado = proponerObjetivosSchema.safeParse({
      objetivos: [...desempeno([25, 25, 25, 25]), desarrollo, desarrollo],
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues.map((i) => i.message)).toContain("Los objetivos de desarrollo no se manejan este año.");
    }
  });
});

describe("resumirResultados", () => {
  it("cuenta cumplen, no cumplen y sin resultado", () => {
    expect(resumirResultados([true, true, false, null])).toEqual({
      total: 4,
      cumplen: 2,
      noCumplen: 1,
      sinResultado: 1,
    });
  });

  it("con lista vacía todo es cero", () => {
    expect(resumirResultados([])).toEqual({ total: 0, cumplen: 0, noCumplen: 0, sinResultado: 0 });
  });
});
