"use client";

import { useState, useTransition } from "react";
import { accionCrearObjetivosCorporativos } from "./actions";

type Fila = {
  titulo: string;
  descripcion: string;
  meta: string;
  indicador: string;
  unidadMedida: string;
};

const CANTIDAD = 8;

function filaVacia(): Fila {
  return { titulo: "", descripcion: "", meta: "", indicador: "", unidadMedida: "" };
}

export function CrearObjetivosCorporativosForm() {
  const [filas, setFilas] = useState<Fila[]>(() => Array.from({ length: CANTIDAD }, filaVacia));
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [pending, startTransition] = useTransition();

  function actualizarFila(indice: number, campo: keyof Fila, valor: string) {
    setFilas((prev) => prev.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f)));
  }

  function enviar() {
    setError(null);
    startTransition(async () => {
      const resultado = await accionCrearObjetivosCorporativos(filas);
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
        Los 8 objetivos corporativos quedaron cargados.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-card bg-iib-surface p-5 shadow-card">
      <p className="text-sm text-iib-secondary">
        Carga los 8 objetivos corporativos del periodo (3.75% cada uno, aplican a toda la
        Corporación).
      </p>

      <div className="flex flex-col gap-3">
        {filas.map((fila, indice) => (
          <div key={indice} className="flex flex-col gap-2 rounded-md border border-iib-border p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-iib-secondary">
              Objetivo {indice + 1} · 3.75%
            </p>
            <input
              value={fila.titulo}
              onChange={(e) => actualizarFila(indice, "titulo", e.target.value)}
              placeholder="Título del objetivo"
              className="rounded-md border border-iib-border bg-iib-background px-2.5 py-1.5 text-sm"
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              <input
                value={fila.descripcion}
                onChange={(e) => actualizarFila(indice, "descripcion", e.target.value)}
                placeholder="Descripción"
                className="rounded-md border border-iib-border bg-iib-background px-2.5 py-1.5 text-sm sm:col-span-1"
              />
              <input
                value={fila.indicador}
                onChange={(e) => actualizarFila(indice, "indicador", e.target.value)}
                placeholder="Indicador"
                className="rounded-md border border-iib-border bg-iib-background px-2.5 py-1.5 text-sm"
              />
              <input
                value={fila.meta}
                onChange={(e) => actualizarFila(indice, "meta", e.target.value)}
                placeholder="Meta"
                className="rounded-md border border-iib-border bg-iib-background px-2.5 py-1.5 text-sm"
              />
              <input
                value={fila.unidadMedida}
                onChange={(e) => actualizarFila(indice, "unidadMedida", e.target.value)}
                placeholder="Unidad de medida"
                className="rounded-md border border-iib-border bg-iib-background px-2.5 py-1.5 text-sm"
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
        {pending ? "Cargando…" : "Cargar objetivos corporativos"}
      </button>
    </div>
  );
}
