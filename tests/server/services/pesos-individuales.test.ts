import { describe, expect, it } from "vitest";
import {
  COMPONENTES_GERENCIA_Y_EMPRESA_HABILITADOS,
  DESARROLLO_HABILITADO,
  PESO_OBJETIVO_INDIVIDUAL,
  PESO_TOTAL_INDIVIDUALES,
} from "@/lib/objetivos-config";
import {
  CANTIDAD_OBJETIVOS_CORPORATIVOS,
  CANTIDAD_OBJETIVOS_DESEMPENO,
  CANTIDAD_OBJETIVOS_GERENCIA,
  PESO_OBJETIVO_CORPORATIVO,
  PESO_OBJETIVO_GERENCIA,
} from "@/server/services/calculo-notas";
import { resumirResultados } from "@/server/services/consolidado.service";
import { proponerObjetivosSchema } from "@/server/validations/aprobacion.schema";

function desempeno(cantidad: number) {
  return Array.from({ length: cantidad }, () => ({
    tipoIndividual: "DESEMPENO" as const,
    descripcion: "Concretar proyectos de inversión",
    acciones: "Campañas internacionales",
    nombreIndicador: "Proyectos concretados",
    indicador: "Proyectos concretados / proyectos planeados",
    meta: "47",
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

describe("propuesta de objetivos individuales (peso automático, sin desarrollo este año)", () => {
  it("el desarrollo está desactivado", () => {
    expect(DESARROLLO_HABILITADO).toBe(false);
  });

  it("gerencia y resultado institucional están ocultos y las 4 metas individuales suman 100 (25 c/u)", () => {
    expect(COMPONENTES_GERENCIA_Y_EMPRESA_HABILITADOS).toBe(false);
    expect(PESO_TOTAL_INDIVIDUALES).toBe(100);
    expect(PESO_OBJETIVO_INDIVIDUAL).toBe(25);
    expect(CANTIDAD_OBJETIVOS_DESEMPENO * PESO_OBJETIVO_INDIVIDUAL).toBe(100);
  });

  it("si se reactivan C2 y C3, los pesos de gerencia y empresa siguen sumando 30 + 30", () => {
    expect(CANTIDAD_OBJETIVOS_GERENCIA * PESO_OBJETIVO_GERENCIA).toBe(30);
    expect(CANTIDAD_OBJETIVOS_CORPORATIVOS * PESO_OBJETIVO_CORPORATIVO).toBe(30);
  });

  it("acepta 4 objetivos de desempeño con meta, sin pedir peso", () => {
    expect(proponerObjetivosSchema.safeParse({ objetivos: desempeno(4) }).success).toBe(true);
  });

  it("rechaza una meta vacía", () => {
    const sinMeta = desempeno(4).map((o, i) => (i === 0 ? { ...o, meta: "" } : o));
    expect(proponerObjetivosSchema.safeParse({ objetivos: sinMeta }).success).toBe(false);
  });

  it("rechaza menos o más de 4 de desempeño", () => {
    expect(proponerObjetivosSchema.safeParse({ objetivos: desempeno(3) }).success).toBe(false);
    expect(proponerObjetivosSchema.safeParse({ objetivos: desempeno(5) }).success).toBe(false);
  });

  it("rechaza objetivos de desarrollo mientras estén desactivados, con un mensaje claro", () => {
    const resultado = proponerObjetivosSchema.safeParse({
      objetivos: [...desempeno(4), desarrollo, desarrollo],
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

describe("indicador (nombre) de los objetivos individuales", () => {
  it("es obligatorio al proponer, aparte de la fórmula del indicador", () => {
    const sin = desempeno(4).map((o, i) => (i === 0 ? { ...o, nombreIndicador: "" } : o));
    const r = proponerObjetivosSchema.safeParse({ objetivos: sin });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe("El indicador es obligatorio.");
  });
});
