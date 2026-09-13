"use client";

import { useState, useTransition } from "react";
import { accionCrearPeriodo } from "./actions";

export function CrearPeriodoForm() {
  const [nombre, setNombre] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar() {
    setError(null);
    startTransition(async () => {
      const resultado = await accionCrearPeriodo({ nombre, fechaInicio, fechaFin });
      if (!resultado.ok) {
        setError(resultado.error);
      } else {
        setNombre("");
        setFechaInicio("");
        setFechaFin("");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-card bg-iib-surface p-5 shadow-card">
      <p className="text-xs font-bold uppercase tracking-wide text-iib-secondary">Crear periodo</p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_auto_auto_auto]">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre (ej. 2027-1)"
          className="rounded-md border border-iib-border bg-iib-background px-2.5 py-2 text-sm"
        />
        <input
          type="date"
          value={fechaInicio}
          onChange={(e) => setFechaInicio(e.target.value)}
          className="rounded-md border border-iib-border bg-iib-background px-2.5 py-2 text-sm"
        />
        <input
          type="date"
          value={fechaFin}
          onChange={(e) => setFechaFin(e.target.value)}
          className="rounded-md border border-iib-border bg-iib-background px-2.5 py-2 text-sm"
        />
        <button
          type="button"
          onClick={enviar}
          disabled={pending || !nombre || !fechaInicio || !fechaFin}
          className="rounded-md bg-iib-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-iib-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Creando…" : "Crear"}
        </button>
      </div>
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}
