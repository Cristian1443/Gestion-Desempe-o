"use client";

import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";
import { Chip } from "@/components/ui/Chip";
import { cumpleCalificacion } from "@/lib/calificacion";
import type { ObjetivoEquipoVista } from "@/server/services/equipo.service";
import { accionCalificarDesarrollo, accionCalificarDesempeno } from "./actions";

export function CalificacionFinalControl({ objetivo }: { objetivo: ObjetivoEquipoVista }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (objetivo.tipoIndividual === "DESARROLLO") {
    function calificar(cumplio: boolean) {
      startTransition(async () => {
        setError(null);
        const resultado = await accionCalificarDesarrollo(objetivo.id, cumplio);
        if (!resultado.ok) setError(resultado.error);
      });
    }

    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-iib-secondary">¿Se cumplió?</span>
          <Boton
            variante="secundario"
            tamano="sm"
            disabled={pending}
            aria-pressed={objetivo.cumplioDesarrollo === true}
            className={objetivo.cumplioDesarrollo === true ? "!border-success !bg-success !text-white" : ""}
            onClick={() => calificar(true)}
          >
            Sí
          </Boton>
          <Boton
            variante="secundario"
            tamano="sm"
            disabled={pending}
            aria-pressed={objetivo.cumplioDesarrollo === false}
            className={objetivo.cumplioDesarrollo === false ? "!border-danger !bg-danger !text-white" : ""}
            onClick={() => calificar(false)}
          >
            No
          </Boton>
        </div>
        {error && <p className="text-xs font-medium text-danger">{error}</p>}
      </div>
    );
  }

  return <CalificacionDesempeno objetivo={objetivo} />;
}

function CalificacionDesempeno({ objetivo }: { objetivo: ObjetivoEquipoVista }) {
  const [valor, setValor] = useState(objetivo.calificacionFinal?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function guardar() {
    setError(null);
    const numero = Number(valor);
    startTransition(async () => {
      const resultado = await accionCalificarDesempeno(objetivo.id, numero);
      if (!resultado.ok) setError(resultado.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-xs font-semibold text-iib-secondary">% de cumplimiento</span>
        {objetivo.calificacionFinal !== null && (
          <Chip tono={cumpleCalificacion(objetivo.calificacionFinal) ? "exito" : "peligro"}>
            {cumpleCalificacion(objetivo.calificacionFinal) ? "Cumple" : "No cumple"}
          </Chip>
        )}
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
        <Boton tamano="sm" disabled={pending || valor === ""} onClick={guardar}>
          {pending ? "Guardando…" : "Guardar"}
        </Boton>
      </div>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
