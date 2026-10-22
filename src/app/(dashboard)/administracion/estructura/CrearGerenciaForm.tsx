"use client";

import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";
import { accionCrearGerencia } from "./actions";

export function CrearGerenciaForm() {
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar() {
    setError(null);
    startTransition(async () => {
      const resultado = await accionCrearGerencia({ nombre });
      if (!resultado.ok) {
        setError(resultado.error);
      } else {
        setNombre("");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-card bg-iib-surface p-5 shadow-card">
      <p className="text-xs font-bold uppercase tracking-wide text-iib-secondary">Crear gerencia</p>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre de la gerencia"
          className="flex-1 rounded-md border border-iib-border bg-iib-background px-2.5 py-2 text-sm"
        />
        <Boton onClick={enviar} disabled={pending || !nombre.trim()}>
          {pending ? "Creando…" : "Crear"}
        </Boton>
      </div>
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}
