"use client";

import { useState, useTransition } from "react";
import { cumpleCalificacion } from "@/lib/calificacion";
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

  return <CalificacionDesempeno objetivo={objetivo} />;
}

// El jefe pone el % de cumplimiento (0 a 100) de la meta; de ahí sale Cumple (80 o más) / No cumple.
function CalificacionDesempeno({ objetivo }: { objetivo: ObjetivoEquipoVista }) {
  const [valor, setValor] = useState(objetivo.calificacionFinal?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const numero = Number(valor);
  const vistaPrevia = valor !== "" && Number.isFinite(numero) && numero >= 0 && numero <= 100 ? cumpleCalificacion(numero) : null;

  function guardar() {
    setError(null);
    startTransition(async () => {
      const resultado = await accionCalificarDesempeno(objetivo.id, numero);
      if (!resultado.ok) setError(resultado.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-xs font-semibold text-iib-secondary">% de cumplimiento</span>
        <input
          type="number"
          min={0}
          max={100}
          step="0.01"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          aria-label="% de cumplimiento (0 a 100)"
          className="w-20 rounded-md border border-iib-border bg-iib-surface px-2 py-1.5 text-sm font-bold tabular-nums"
        />
        {vistaPrevia !== null && (
          <span
            className={`rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${vistaPrevia ? "bg-success text-white" : "bg-danger text-white"}`}
          >
            {vistaPrevia ? "Cumple" : "No cumple"}
          </span>
        )}
        <button
          type="button"
          disabled={pending || valor === ""}
          onClick={guardar}
          className="rounded-md bg-iib-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-iib-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
