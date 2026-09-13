// Catálogo fijo de líneas estratégicas corporativas. Única fuente de verdad
// para el texto de cada línea — úsalo en vez de repetir estos textos en
// formularios o vistas.
export const LINEAS_ESTRATEGICAS = {
  L1: "L1: Facilitar la inversión extranjera relevante en Bogotá-Región.",
  L2: "L2: Gestionar reuniones y eventos de clase mundial.",
  L3: "L3: Aportar al posicionamiento de Invest in Bogotá y de Bogotá-Región como el destino preferido para hacer negocios en América Latina.",
  L4: "L4: Contribuir a la mejora del entorno de negocios en Bogotá-Región.",
  L5: "L5: Transversal - sostenibilidad operativa.",
} as const;

export type LineaEstrategicaCodigo = keyof typeof LINEAS_ESTRATEGICAS;

// Tupla literal (no `string[]`) para que z.enum() en las validaciones
// conserve el tipo unión "L1" | "L2" | ... en vez de ensancharlo a `string`.
export const CODIGOS_LINEA_ESTRATEGICA = ["L1", "L2", "L3", "L4", "L5"] as const satisfies readonly LineaEstrategicaCodigo[];
