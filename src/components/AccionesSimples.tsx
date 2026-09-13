"use client";

import { useRef, useState, useTransition } from "react";

export type EstadoAccionSimple = { ok: true } | { ok: false; error: string };

// Botón de una sola acción (sin campos) conectado directo a una Server
// Action pre-atada con `.bind(null, id)` desde el Server Component que lo
// renderiza. Compartido entre "Mi equipo" (aprobar/validar) y
// "Administración" (abrir/cerrar periodo).
export function BotonAccionSimple({
  etiqueta,
  etiquetaEnviando,
  variante = "primary",
  accion,
}: {
  etiqueta: string;
  etiquetaEnviando: string;
  variante?: "primary" | "ghost";
  accion: () => Promise<EstadoAccionSimple>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const clases =
    variante === "primary"
      ? "bg-iib-primary text-white hover:bg-iib-primary-hover"
      : "border border-iib-border text-iib-foreground hover:bg-iib-surface-sunken";

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const resultado = await accion();
            if (!resultado.ok) setError(resultado.error);
          })
        }
        className={`rounded-md px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${clases}`}
      >
        {pending ? etiquetaEnviando : etiqueta}
      </button>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

// Botón que abre un diálogo con un solo campo de comentario obligatorio,
// conectado a una Server Action pre-atada con el id correspondiente.
export function DialogDevolverConComentario({
  etiquetaBoton,
  titulo,
  placeholder,
  accion,
}: {
  etiquetaBoton: string;
  titulo: string;
  placeholder: string;
  accion: (comentario: string) => Promise<EstadoAccionSimple>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar() {
    setError(null);
    startTransition(async () => {
      const resultado = await accion(comentario);
      if (!resultado.ok) {
        setError(resultado.error);
      } else {
        setComentario("");
        dialogRef.current?.close();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="rounded-md border border-danger/40 px-3.5 py-2 text-sm font-semibold text-danger transition hover:bg-danger-bg"
      >
        {etiquetaBoton}
      </button>

      <dialog
        ref={dialogRef}
        className="w-[calc(100%-2rem)] max-w-md rounded-card bg-iib-surface p-0 text-iib-foreground shadow-card backdrop:bg-black/45"
      >
        <div className="flex flex-col gap-3.5 p-6">
          <h3 className="text-base font-semibold">{titulo}</h3>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder={placeholder}
            rows={4}
            className="resize-y rounded-md border border-iib-border bg-iib-background px-2.5 py-2 text-sm text-iib-foreground"
          />
          {error && <p className="text-sm font-medium text-danger">{error}</p>}
          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              className="rounded-md border border-iib-border px-3.5 py-2 text-sm font-medium transition hover:bg-iib-surface-sunken"
              onClick={() => dialogRef.current?.close()}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={pending || comentario.trim().length === 0}
              onClick={enviar}
              className="rounded-md bg-danger px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Enviando…" : "Confirmar devolución"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
