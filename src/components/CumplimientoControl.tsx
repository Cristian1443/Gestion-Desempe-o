"use client";

import { useState, useTransition } from "react";
type Resultado = { ok: true } | { ok: false; error: string };

// Resultado final del indicador (de la empresa o de gerencia). Quien edita lo
// marca dentro de la franja del % de cumplimiento; fuera de ella (o para los
// demás) es solo lectura. La Server Action que valida y guarda llega por prop.
export function CumplimientoControl({
  objetivoId,
  cumplido,
  accion,
}: {
  objetivoId: string;
  cumplido: boolean | null;
  accion: (objetivoId: string, cumple: boolean) => Promise<Resultado>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function marcar(cumple: boolean) {
    setError(null);
    startTransition(async () => {
      const resultado = await accion(objetivoId, cumple);
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
