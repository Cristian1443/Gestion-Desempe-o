"use client";

import { useState, useTransition } from "react";
import { accionGuardarEvidencia } from "./actions";

// Lo que se sabe de la ventana de evidencias del objetivo, ya listo para pintar (sin fechas
// ni objetos de Date, que no cruzan al cliente): abierta para el próximo seguimiento o cerrada.
export type VentanaEvidenciaUI =
  | { abierta: true; numero: number; indicacion: string }
  | { abierta: false; motivo: string };

// Cuadro para que el colaborador cuente qué hizo antes del próximo seguimiento. Solo se
// dibuja con la ventana abierta; se puede corregir mientras siga abierta.
export function EvidenciaForm({
  objetivoId,
  numero,
  indicacion,
  textoInicial,
}: {
  objetivoId: string;
  numero: number;
  indicacion: string;
  textoInicial: string;
}) {
  const [texto, setTexto] = useState(textoInicial);
  const [guardado, setGuardado] = useState(textoInicial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function guardar() {
    setError(null);
    startTransition(async () => {
      const resultado = await accionGuardarEvidencia({ objetivoId, texto });
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setGuardado(texto.trim());
    });
  }

  const sinCambios = texto.trim() === guardado.trim();

  return (
    <div className="flex flex-col gap-2 rounded-md border border-iib-primary/30 bg-iib-primary/[0.04] p-3.5">
      <label className="text-xs font-bold uppercase tracking-wide text-iib-primary" htmlFor={`evidencia-${objetivoId}`}>
        Evidencias realizadas · antes del seguimiento {numero}
      </label>
      <p className="text-xs text-iib-secondary">{indicacion}</p>
      <textarea
        id={`evidencia-${objetivoId}`}
        rows={4}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={3000}
        placeholder="¿Qué hiciste en este periodo para lograr el objetivo? Actividades, resultados, enlaces a la evidencia…"
        className="rounded-md border border-iib-border bg-iib-surface px-2.5 py-2 text-sm shadow-sm transition focus:border-iib-primary focus:outline-none focus:ring-2 focus:ring-iib-primary/15"
      />
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
      <div className="flex items-center justify-end gap-3">
        {guardado && sinCambios && <span className="text-xs font-medium text-success">Guardado</span>}
        <button
          type="button"
          onClick={guardar}
          disabled={pending || !texto.trim() || sinCambios}
          className="rounded-md bg-iib-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-iib-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Guardando…" : guardado ? "Actualizar evidencias" : "Guardar evidencias"}
        </button>
      </div>
    </div>
  );
}
