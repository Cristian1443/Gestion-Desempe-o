"use client";

import { useState, useTransition } from "react";
import { accionAgregarCorte } from "./actions";

export function AgregarCorteForm({ periodoId }: { periodoId: string }) {
  const [nombre, setNombre] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar() {
    setError(null);
    startTransition(async () => {
      const resultado = await accionAgregarCorte({ periodoId, nombre, fechaLimite });
      if (!resultado.ok) {
        setError(resultado.error);
      } else {
        setNombre("");
        setFechaLimite("");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del corte (ej. Corte 1)"
          className="rounded-md border border-iib-border bg-iib-background px-2.5 py-1.5 text-sm"
        />
        <input
          type="date"
          value={fechaLimite}
          onChange={(e) => setFechaLimite(e.target.value)}
          className="rounded-md border border-iib-border bg-iib-background px-2.5 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={enviar}
          disabled={pending || !nombre || !fechaLimite}
          className="rounded-md border border-iib-border px-3 py-1.5 text-sm font-medium transition hover:bg-iib-surface-sunken disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Agregando…" : "Agregar corte"}
        </button>
      </div>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
