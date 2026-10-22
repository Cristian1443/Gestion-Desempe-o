"use client";

import { forwardRef, useId, useImperativeHandle, useRef, useState, useTransition } from "react";

type Resultado = { ok: true } | { ok: false; error: string };

export interface DialogoAvanceHandle {
  abrir(inicial: { porcentaje: number | null; comentario: string | null; corrigiendo: boolean }): void;
}

// Diálogo para registrar (o corregir) el avance de un indicador: el % acumulado
// (0 a 100) y un comentario. Lo usan la tira de meses de los indicadores de la
// empresa y la tira de seguimientos de los de gerencia; quien lo abre decide
// qué se guarda con `onGuardar`.
export const DialogoAvance = forwardRef<
  DialogoAvanceHandle,
  {
    titulo: string;
    subtitulo: string;
    pregunta?: string;
    placeholder?: string;
    onGuardar: (porcentaje: number, comentario: string) => Promise<Resultado>;
  }
>(function DialogoAvance(
  {
    titulo,
    subtitulo,
    pregunta = "¿En qué porcentaje va el indicador? (acumulado, 0 a 100)",
    placeholder = "¿Qué se hizo y qué sigue?",
    onGuardar,
  },
  ref,
) {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [porcentaje, setPorcentaje] = useState("");
  const [comentario, setComentario] = useState("");
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useImperativeHandle(ref, () => ({
    abrir(inicial) {
      setPorcentaje(inicial.porcentaje !== null ? String(inicial.porcentaje) : "");
      setComentario(inicial.comentario ?? "");
      setCorrigiendo(inicial.corrigiendo);
      setError(null);
      dialogRef.current?.showModal();
    },
  }));

  function guardar() {
    setError(null);
    startTransition(async () => {
      const resultado = await onGuardar(Number(porcentaje), comentario);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      dialogRef.current?.close();
    });
  }

  const valorSlider = Math.min(100, Math.max(0, Number(porcentaje) || 0));

  return (
    <dialog
      ref={dialogRef}
      className="w-[calc(100%-2rem)] max-w-md rounded-card bg-iib-surface p-0 text-iib-foreground shadow-card backdrop:bg-black/45"
    >
      <div className="flex flex-col gap-3.5 p-6">
        <h3 className="text-base font-semibold">{titulo}</h3>
        <p className="-mt-2 text-sm text-iib-secondary">{subtitulo}</p>

        <div className="flex flex-col gap-1.5 text-sm text-iib-secondary">
          <label htmlFor={`${id}-pct`}>{pregunta}</label>
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
            placeholder={placeholder}
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
  );
});
