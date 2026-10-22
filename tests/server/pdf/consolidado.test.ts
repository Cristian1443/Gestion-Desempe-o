import { describe, expect, it } from "vitest";
import { generarConsolidadoPdf } from "@/server/pdf/consolidado";
import type { ConsolidadoDatos } from "@/server/services/consolidado.service";

const dia = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const resumenVacio = { total: 0, cumplen: 0, noCumplen: 0, sinResultado: 0 };

function datosVacios(): ConsolidadoDatos {
  return {
    periodo: { nombre: "2026", fechaInicio: dia("2026-01-01"), fechaFin: dia("2026-12-31"), estado: "CERRADO" },
    generadoEn: dia("2027-01-26"),
    resumen: { individuales: resumenVacio, gerencia: resumenVacio, empresa: resumenVacio },
    empresa: [],
    gerencias: [],
    individuales: [],
  };
}

function paginas(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length;
}

describe("generarConsolidadoPdf", () => {
  it("genera un PDF válido aunque no haya ningún objetivo", async () => {
    const pdf = await generarConsolidadoPdf(datosVacios());
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1000);
    // Portada + una página por sección.
    expect(paginas(pdf)).toBeGreaterThanOrEqual(4);
  });

  it("incluye de todo un poco, con tildes, emojis y textos muy largos, y pagina sin fallar", async () => {
    const largo = "Descripción muy larga con acentos y eñes. ".repeat(60);
    const datos = datosVacios();

    datos.empresa = Array.from({ length: 8 }, (_, i) => ({
      titulo: `Indicador ${i + 1} — inversión extranjera 🚀`,
      descripcion: largo,
      meta: "100",
      unidadMedida: "%",
      indicador: "Fórmula de cálculo",
      cumplido: i % 3 === 0 ? true : i % 3 === 1 ? false : null,
      avances: [
        { mes: "2026-09", porcentaje: 40, comentario: "Avance de septiembre ✅" },
        { mes: "2026-10", porcentaje: 60, comentario: largo },
      ],
    }));

    datos.gerencias = [
      {
        nombre: "Gerencia de Promoción de Inversión",
        gerente: "Juliana Marquez Pérez",
        indicadores: [
          {
            titulo: "Atraer proyectos de IED",
            descripcion: "Captar proyectos hacia Bogotá.",
            meta: "12",
            unidadMedida: "proyectos",
            indicador: "Proyectos anunciados",
            cumplido: true,
            seguimientos: [
              { numero: 1, fechaInicio: dia("2026-01-01"), fechaFin: dia("2026-03-31"), porcentaje: 30, comentario: "Primer trimestre" },
              { numero: 2, fechaInicio: dia("2026-04-01"), fechaFin: dia("2026-06-30"), porcentaje: null, comentario: largo },
            ],
          },
        ],
      },
    ];

    datos.individuales = [
      {
        gerencia: "Gerencia de Promoción de Inversión",
        personas: Array.from({ length: 25 }, (_, p) => ({
          nombre: `Colaborador número ${p + 1} Muñoz`,
          cargo: "Oficial Senior",
          objetivos: Array.from({ length: 4 }, (_, o) => ({
            descripcion: `Objetivo ${o + 1}: ${largo}`,
            acciones: "Acciones concretas",
            indicador: "Indicador de cumplimiento",
            lineaEstrategica: "L1: Facilitar la inversión extranjera relevante en Bogotá-Región.",
            cumplido: o % 2 === 0,
            seguimientos: [{ numero: 1, comentario: "Seguimiento uno" }, { numero: 2, comentario: largo }],
          })),
        })),
      },
      { gerencia: "Sin gerencia asignada", personas: [] },
    ];

    datos.resumen = {
      individuales: { total: 100, cumplen: 50, noCumplen: 50, sinResultado: 0 },
      gerencia: { total: 1, cumplen: 1, noCumplen: 0, sinResultado: 0 },
      empresa: { total: 8, cumplen: 3, noCumplen: 3, sinResultado: 2 },
    };

    const pdf = await generarConsolidadoPdf(datos);
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    // Mucho contenido: tiene que haber pasado a varias páginas.
    expect(paginas(pdf)).toBeGreaterThan(20);
  });
});
