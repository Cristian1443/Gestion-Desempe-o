"use client";

import { accionDefinirFranjaCumplimiento } from "./actions";
import { FranjaFechasForm } from "./FranjaFechasForm";

// Franja en la que se pone el % de cumplimiento final de cada objetivo.
export function FranjaCumplimientoForm({
  periodoId,
  inicio,
  fin,
}: {
  periodoId: string;
  // Fechas ya guardadas, como "AAAA-MM-DD"; vacías si todavía no se define.
  inicio: string;
  fin: string;
}) {
  const definida = inicio !== "" && fin !== "";
  return (
    <FranjaFechasForm
      key={`${inicio}-${fin}`}
      inicioInicial={inicio}
      finInicial={fin}
      etiquetaGuardar={definida ? "Cambiar franja" : "Definir franja"}
      etiquetaGuardando="Guardando…"
      onGuardar={(fechaInicio, fechaFin) => accionDefinirFranjaCumplimiento({ periodoId, fechaInicio, fechaFin })}
    />
  );
}
