"use client";

import { useState, useTransition } from "react";
import { CumplimientoControl } from "@/components/CumplimientoControl";
import type { ObjetivoEquipoVista } from "@/server/services/equipo.service";
import { accionCalificarDesarrollo, accionCalificarDesempeno } from "./actions";

export function CalificacionFinalControl({ objetivo }: { objetivo: ObjetivoEquipoVista }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (objetivo.tipoIndividual === "DESARROLLO") {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-iib-secondary">¿Se cumplió?</span>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const resultado = await accionCalificarDesarrollo(objetivo.id, true);
                if (!resultado.ok) setError(resultado.error);
              })
            }
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              objetivo.cumplioDesarrollo === true
                ? "bg-success text-white"
                : "border border-iib-border text-iib-foreground hover:bg-iib-surface-sunken"
            }`}
          >
            Sí
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const resultado = await accionCalificarDesarrollo(objetivo.id, false);
                if (!resultado.ok) setError(resultado.error);
              })
            }
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              objetivo.cumplioDesarrollo === false
                ? "bg-danger text-white"
                : "border border-iib-border text-iib-foreground hover:bg-iib-surface-sunken"
            }`}
          >
            No
          </button>
        </div>
        {error && <p className="text-xs font-medium text-danger">{error}</p>}
      </div>
    );
  }

  // Objetivos de desempeño: Cumple / No cumple, sin peso.
  return <CumplimientoControl objetivoId={objetivo.id} cumplido={objetivo.cumplido} accion={accionCalificarDesempeno} />;
}
