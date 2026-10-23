import { LINEAS_ESTRATEGICAS, type LineaEstrategicaCodigo } from "@/lib/lineas-estrategicas";

// Los indicadores (de la empresa y de gerencia) se clasifican con las líneas
// estratégicas L1 a L4. La L5 es transversal (sostenibilidad operativa) y no aplica.
export const CODIGOS_LINEA_INDICADOR = ["L1", "L2", "L3", "L4"] as const satisfies readonly LineaEstrategicaCodigo[];
export type LineaIndicadorCodigo = (typeof CODIGOS_LINEA_INDICADOR)[number];

// Un indicador puede ser estratégico o de gestión (así vienen en las tablas oficiales).
export const TIPOS_INDICADOR = ["ESTRATEGICO", "GESTION"] as const;
export type TipoIndicadorCodigo = (typeof TIPOS_INDICADOR)[number];

export const ETIQUETA_TIPO_INDICADOR: Record<TipoIndicadorCodigo, string> = {
  ESTRATEGICO: "Estratégico",
  GESTION: "De gestión",
};

// Texto completo de una línea ("L1: Facilitar la inversión…"), o null si no hay.
export function textoLinea(codigo: string | null | undefined): string | null {
  if (!codigo) return null;
  return LINEAS_ESTRATEGICAS[codigo as LineaEstrategicaCodigo] ?? null;
}
