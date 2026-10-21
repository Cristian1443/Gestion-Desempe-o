"use client";

import { useId, useRef, useState, useTransition } from "react";
import { accionRegistrarAvance } from "./actions";

export interface MesVista {
  mes: string; // "AAAA-MM"
  etiqueta: string; // "octubre 2026"
  corto: string; // "oct"
  porcentaje: number | null;
  comentario: string | null;
  // Ya se puede registrar (hasta el mes en curso).
  registrable: boolean;
  esMesActual: boolean;
}

// La tira de 12 meses de un indicador para quien edita: al tocar un mes que ya
// se puede registrar, abre un único diálogo para escribir (o corregir) su avance:
// el % acumulado y un comentario. Los meses futuros quedan apagados.
export function TiraMesesEditable({
  objetivoId,
  tituloIndicador,
  meses,
}: {
  objetivoId: string;
  tituloIndicador: string;
  meses: MesVista[];
}) {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [seleccionado, setSeleccionado] = useState<MesVista | null>(null);
  const [porcentaje, setPorcentaje] = useState("");
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const corrigiendo = seleccionado?.porcentaje != null;

  function abrir(mes: MesVista) {
    setSeleccionado(mes);
    setPorcentaje(mes.porcentaje !== null ? String(mes.porcentaje) : "");
    setComentario(mes.comentario ?? "");
    setError(null);
    dialogRef.current?.showModal();
  }

  function guardar() {
    if (!seleccionado) return;
    setError(null);
    startTransition(async () => {
      const resultado = await accionRegistrarAvance({
        objetivoId,
        mes: seleccionado.mes,
        porcentaje: Number(porcentaje),
        comentario,
      });
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      dialogRef.current?.close();
    });
  }

  const valorSlider = Math.min(100, Math.max(0, Number(porcentaje) || 0));

  return (
    <>
      <ol className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-12" aria-label="Avance por mes">
        {meses.map((m) => {
          const contenido = (
            <>
              <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-iib-secondary">{m.corto}</span>
              <span className="text-sm font-bold tabular-nums">
                {m.porcentaje !== null ? `${m.porcentaje}%` : m.registrable ? "+" : "—"}
              </span>
            </>
          );
          const borde = m.esMesActual ? "border-iib-primary ring-2 ring-iib-primary/20" : "border-iib-border";
          const fondo = m.porcentaje !== null ? "bg-iib-surface-sunken" : "bg-iib-surface";

          return (
            <li key={m.mes} className="contents">
              {m.registrable ? (
                <button
                  type="button"
                  onClick={() => abrir(m)}
                  aria-label={`${m.porcentaje !== null ? "Corregir" : "Registrar"} el avance de ${m.etiqueta}`}
                  className={`flex flex-col items-center gap-0.5 rounded-md border px-1 py-1.5 text-center transition hover:border-iib-primary hover:bg-iib-surface-sunken ${borde} ${fondo}`}
                >
                  {contenido}
                </button>
              ) : (
                <div
                  title={m.etiqueta}
                  className={`flex flex-col items-center gap-0.5 rounded-md border px-1 py-1.5 text-center opacity-40 ${borde} ${fondo}`}
                >
                  {contenido}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <dialog
        ref={dialogRef}
        className="w-[calc(100%-2rem)] max-w-md rounded-card bg-iib-surface p-0 text-iib-foreground shadow-card backdrop:bg-black/45"
      >
        <div className="flex flex-col gap-3.5 p-6">
          <h3 className="text-base font-semibold">Avance de {seleccionado?.etiqueta}</h3>
          <p className="-mt-2 text-sm text-iib-secondary">{tituloIndicador}</p>

          <div className="flex flex-col gap-1.5 text-sm text-iib-secondary">
            <label htmlFor={`${id}-pct`}>¿En qué porcentaje va el indicador? (acumulado, 0 a 100)</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={valorSlider}
                onChange={(e) => setPorcentaje(e.target.value)}
                aria-label="Porcentaje de avance"
                className="min-w-0 flex-1 accent-iib-primary"
              />
              <div className="flex items-center gap-1">
                <input
                  id={`${id}-pct`}
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={porcentaje}
                  onChange={(e) => setPorcentaje(e.target.value)}
                  className="w-16 rounded-md border border-iib-border bg-iib-background px-2 py-1.5 text-right text-sm font-bold tabular-nums text-iib-foreground"
                />
                <span className="font-bold text-iib-foreground">%</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 text-sm text-iib-secondary">
            <label htmlFor={`${id}-comentario`}>Comentario del seguimiento</label>
            <textarea
              id={`${id}-comentario`}
              rows={4}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="¿Qué se hizo este mes y qué sigue?"
              className="resize-y rounded-md border border-iib-border bg-iib-background px-2.5 py-2 text-sm text-iib-foreground"
            />
          </div>

          {error && <p className="text-sm font-medium text-danger">{error}</p>}

          <div className="mt-1 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-md border border-iib-border px-3.5 py-2 text-sm font-medium transition hover:bg-iib-surface-sunken"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={pending || porcentaje === "" || comentario.trim() === ""}
              onClick={guardar}
              className="rounded-md bg-iib-primary px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-iib-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Guardando…" : corrigiendo ? "Guardar corrección" : "Guardar avance"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
