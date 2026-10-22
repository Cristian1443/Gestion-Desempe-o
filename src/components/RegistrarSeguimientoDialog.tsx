"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";

export type EstadoAccionSeguimiento = { ok: true } | { ok: false; error: string };

const ESTADO_INICIAL: EstadoAccionSeguimiento = { ok: true };

function BotonEnviar({ etiqueta, etiquetaEnviando }: { etiqueta: string; etiquetaEnviando: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-iib-primary px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-iib-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? etiquetaEnviando : etiqueta}
    </button>
  );
}

// Diálogo de seguimiento compartido entre Individual, Gerencia y Corporativo:
// la Server Action que realmente valida y persiste el registro se recibe como
// prop, así la única diferencia entre los tres usos es a qué función se
// conecta, no el formulario en sí. Cada registro es solo comentario + fecha
// (la fecha la pone el servidor); el resultado final es un juicio aparte que
// se pone una sola vez, al final, dentro de su franja.
export function RegistrarSeguimientoDialog({
  objetivoId,
  tituloObjetivo,
  numeroSeguimiento,
  franja,
  etiquetaBoton = "Registrar seguimiento",
  etiquetaEnviar = "Guardar",
  etiquetaEnviando = "Guardando…",
  accion,
}: {
  objetivoId: string;
  tituloObjetivo: string;
  numeroSeguimiento: number;
  // Franja del seguimiento en curso, ya formateada (ej. "16 mar 2026 al 31 mar 2026").
  franja: string;
  etiquetaBoton?: string;
  etiquetaEnviar?: string;
  etiquetaEnviando?: string;
  accion: (
    estadoPrevio: EstadoAccionSeguimiento,
    formData: FormData,
  ) => Promise<EstadoAccionSeguimiento>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [estado, formAction] = useFormState(accion, ESTADO_INICIAL);
  const enviosPrevios = useRef(0);

  useEffect(() => {
    // Detecta un envío exitoso (nuevo `estado.ok === true` tras interacción,
    // no el estado inicial) para cerrar el diálogo automáticamente.
    if (enviosPrevios.current > 0 && estado.ok) {
      dialogRef.current?.close();
      formRef.current?.reset();
    }
  }, [estado]);

  return (
    <>
      <button
        type="button"
        className="rounded-md bg-iib-primary px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-iib-primary-hover"
        onClick={() => dialogRef.current?.showModal()}
      >
        {etiquetaBoton}
      </button>

      <dialog
        ref={dialogRef}
        className="w-[calc(100%-2rem)] max-w-md rounded-card bg-iib-surface p-0 text-iib-foreground shadow-card backdrop:bg-black/45"
      >
        <form
          ref={formRef}
          action={(formData) => {
            enviosPrevios.current += 1;
            formAction(formData);
          }}
          className="flex flex-col gap-3.5 p-6"
        >
          <h3 className="text-base font-semibold">Seguimiento {numeroSeguimiento}</h3>
          <p className="-mt-2 text-sm text-iib-secondary">{tituloObjetivo}</p>
          <p className="-mt-2 text-xs text-iib-secondary">Franja: {franja}</p>

          <input type="hidden" name="objetivoId" value={objetivoId} />

          <label className="flex flex-col gap-1 text-sm text-iib-secondary">
            Comentario
            <textarea
              name="comentario"
              rows={4}
              required
              placeholder="Describe cómo va este objetivo en este seguimiento…"
              className="resize-y rounded-md border border-iib-border bg-iib-background px-2.5 py-2 text-sm text-iib-foreground"
            />
          </label>

          {!estado.ok && enviosPrevios.current > 0 && (
            <p className="text-sm font-medium text-danger">{estado.error}</p>
          )}

          <div className="mt-1 flex justify-end gap-2.5">
            <button
              type="button"
              className="rounded-md border border-iib-border px-3.5 py-2 text-sm font-medium transition hover:bg-iib-surface-sunken"
              onClick={() => dialogRef.current?.close()}
            >
              Cancelar
            </button>
            <BotonEnviar etiqueta={etiquetaEnviar} etiquetaEnviando={etiquetaEnviando} />
          </div>
        </form>
      </dialog>
    </>
  );
}
