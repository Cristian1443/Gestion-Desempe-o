import { describe, expect, it } from "vitest";
import { DESARROLLO_HABILITADO } from "@/lib/objetivos-config";
import { resumirResultados } from "@/server/services/consolidado.service";
import { proponerObjetivosSchema } from "@/server/validations/aprobacion.schema";

function desempeno(n: number) {
  return Array.from({ length: n }, () => ({
    tipoIndividual: "DESEMPENO" as const,
    descripcion: "Concretar proyectos de inversión",
    acciones: "Campañas internacionales",
    indicador: "Proyectos concretados",
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

describe("propuesta de objetivos individuales (sin peso, sin desarrollo este año)", () => {
  it("el desarrollo está desactivado mientras no se cambie el interruptor", () => {
    expect(DESARROLLO_HABILITADO).toBe(false);
  });

  it("acepta 4 objetivos de desempeño sin peso", () => {
    expect(proponerObjetivosSchema.safeParse({ objetivos: desempeno(4) }).success).toBe(true);
  });

  it("rechaza menos o más de 4 de desempeño", () => {
    expect(proponerObjetivosSchema.safeParse({ objetivos: desempeno(3) }).success).toBe(false);
    expect(proponerObjetivosSchema.safeParse({ objetivos: desempeno(5) }).success).toBe(false);
  });

  it("rechaza objetivos de desarrollo mientras estén desactivados, con un mensaje claro", () => {
    const resultado = proponerObjetivosSchema.safeParse({ objetivos: [...desempeno(4), desarrollo, desarrollo] });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.message).toBe("Los objetivos de desarrollo no se manejan este año.");
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
