"use client";

import { useState, useTransition } from "react";
import { accionMarcarCumplimiento } from "./actions";

// Resultado final del indicador. Quien edita lo marca dentro de la franja del %
// de cumplimiento; fuera de ella (o para los demás) es solo lectura.
export function CumplimientoControl({ objetivoId, cumplido }: { objetivoId: string; cumplido: boolean | null }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function marcar(cumple: boolean) {
    setError(null);
    startTransition(async () => {
      const resultado = await accionMarcarCumplimiento(objetivoId, cumple);
      if (!resultado.ok) setError(resultado.error);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-iib-secondary">Resultado final</span>
        <button
          type="button"
          disabled={pending}
          onClick={() => marcar(true)}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
            cumplido === true
              ? "bg-success text-white"
              : "border border-iib-border text-iib-foreground hover:bg-iib-surface-sunken"
          }`}
        >
          Cumple
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => marcar(false)}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
            cumplido === false
              ? "bg-danger text-white"
              : "border border-iib-border text-iib-foreground hover:bg-iib-surface-sunken"
          }`}
        >
          No cumple
        </button>
      </div>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
