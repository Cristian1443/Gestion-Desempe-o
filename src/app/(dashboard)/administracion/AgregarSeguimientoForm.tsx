"use client";

import { accionAgregarSeguimiento } from "./actions";
import { FranjaFechasForm } from "./FranjaFechasForm";

// El número del seguimiento lo asigna el sistema (el siguiente al último); aquí
// solo se escoge su franja.
export function AgregarSeguimientoForm({ periodoId }: { periodoId: string }) {
  return (
    <FranjaFechasForm
      etiquetaGuardar="Agregar seguimiento"
      etiquetaGuardando="Agregando…"
      limpiarAlExito
      onGuardar={(fechaInicio, fechaFin) => accionAgregarSeguimiento({ periodoId, fechaInicio, fechaFin })}
    />
  );
}
