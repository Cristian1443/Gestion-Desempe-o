"use client";

import { useState, useTransition } from "react";
import { accionCrearObjetivosGerencia } from "./actions";

type Fila = {
  titulo: string;
  descripcion: string;
  meta: string;
  indicador: string;
  unidadMedida: string;
};

function filaVacia(): Fila {
  return { titulo: "", descripcion: "", meta: "", indicador: "", unidadMedida: "" };
}

export function CrearObjetivosGerenciaForm() {
  const [filas, setFilas] = useState<[Fila, Fila]>([filaVacia(), filaVacia()]);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [pending, startTransition] = useTransition();

  function actualizarFila(indice: 0 | 1, campo: keyof Fila, valor: string) {
    setFilas((prev) => {
      const copia: [Fila, Fila] = [...prev];
      copia[indice] = { ...copia[indice], [campo]: valor };
      return copia;
    });
  }

  function enviar() {
    setError(null);
    startTransition(async () => {
      const resultado = await accionCrearObjetivosGerencia(filas);
      if (!resultado.ok) {
        setError(resultado.error);
      } else {
        setEnviado(true);
      }
    });
  }

  if (enviado) {
    return (
      <div className="rounded-card bg-success-bg p-5 text-sm font-medium text-success shadow-card">
        Los objetivos de gerencia quedaron cargados.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-card bg-iib-surface p-5 shadow-card">
      <p className="text-sm text-iib-secondary">
        Carga los 2 objetivos de tu gerencia para este periodo (15% cada uno, aplican a todo tu
        equipo).
      </p>

      <div className="flex flex-col gap-4">
        {filas.map((fila, indice) => (
          <div key={indice} className="flex flex-col gap-2.5 rounded-md border border-iib-border p-3.5">
            <p className="text-xs font-bold uppercase tracking-wide text-iib-secondary">
              Objetivo {indice + 1} · 15%
            </p>
            <input
              value={fila.titulo}
              onChange={(e) => actualizarFila(indice as 0 | 1, "titulo", e.target.value)}
              placeholder="Título del objetivo"
              className="rounded-md border border-iib-border bg-iib-background px-2.5 py-2 text-sm"
            />
            <textarea
              value={fila.descripcion}
              onChange={(e) => actualizarFila(indice as 0 | 1, "descripcion", e.target.value)}
              placeholder="Descripción"
              rows={2}
              className="resize-y rounded-md border border-iib-border bg-iib-background px-2.5 py-2 text-sm"
            />
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <input
                value={fila.indicador}
                onChange={(e) => actualizarFila(indice as 0 | 1, "indicador", e.target.value)}
                placeholder="Indicador"
                className="rounded-md border border-iib-border bg-iib-background px-2.5 py-2 text-sm"
              />
              <input
                value={fila.meta}
                onChange={(e) => actualizarFila(indice as 0 | 1, "meta", e.target.value)}
                placeholder="Meta"
                className="rounded-md border border-iib-border bg-iib-background px-2.5 py-2 text-sm"
              />
              <input
                value={fila.unidadMedida}
                onChange={(e) => actualizarFila(indice as 0 | 1, "unidadMedida", e.target.value)}
                placeholder="Unidad de medida"
                className="rounded-md border border-iib-border bg-iib-background px-2.5 py-2 text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm font-medium text-danger">{error}</p>}

      <button
        type="button"
        onClick={enviar}
        disabled={pending}
        className="self-end rounded-md bg-iib-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-iib-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Cargando…" : "Cargar objetivos de gerencia"}
      </button>
    </div>
  );
}
