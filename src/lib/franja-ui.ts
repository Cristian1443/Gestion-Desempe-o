import { formatearFecha } from "@/lib/fecha";
import type { ContextoFranjas } from "@/server/services/periodos.service";

// Lo mínimo de las franjas que necesitan las pantallas para decidir qué botón
// mostrar. Son solo textos y números para poder pasarlo a componentes de
// cliente sin arrastrar objetos Date ni código de servidor.
export interface FranjaUI {
  // El seguimiento que está en curso hoy y su franja ya formateada. Null: hoy
  // nadie puede registrar seguimiento.
  seguimientoEnCurso: { numero: number; texto: string } | null;
  // Contra cuál se mide "falta seguimiento": el que está en curso o el último
  // que ya empezó.
  referenciaNumero: number | null;
  // True si hoy está dentro de la franja del % de cumplimiento.
  cumplimientoEnCurso: boolean;
}

export function aFranjaUI(franjas: ContextoFranjas): FranjaUI {
  const enCurso = franjas.seguimientoEnCurso;
  return {
    seguimientoEnCurso: enCurso
      ? {
          numero: enCurso.numero,
          texto: `${formatearFecha(enCurso.fechaInicio)} al ${formatearFecha(enCurso.fechaFin)}`,
        }
      : null,
    referenciaNumero: franjas.seguimientoReferencia?.numero ?? null,
    cumplimientoEnCurso: franjas.cumplimiento?.estado === "EN_CURSO",
  };
}
