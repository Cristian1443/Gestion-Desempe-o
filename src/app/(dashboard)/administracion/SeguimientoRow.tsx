"use client";

import { useState, useTransition } from "react";
import { formatearFecha } from "@/lib/fecha";
import type { EstadoFranja } from "@/lib/franja";
import { accionEditarSeguimiento, accionEliminarSeguimiento } from "./actions";
import { FranjaFechasForm } from "./FranjaFechasForm";

const ETIQUETA_ESTADO: Record<EstadoFranja, string> = {
  PROXIMA: "Próximo",
  EN_CURSO: "En curso",
  FINALIZADA: "Finalizado",
};

const CLASES_ESTADO: Record<EstadoFranja, string> = {
  PROXIMA: "bg-iib-surface-sunken text-iib-secondary",
  EN_CURSO: "bg-success-bg text-success",
  FINALIZADA: "bg-iib-surface-sunken text-iib-secondary",
};

// Un seguimiento del periodo con su franja. El estado se calcula por fecha en
// el servidor: nadie lo abre ni lo cierra a mano.
export function SeguimientoRow({
  seguimiento,
  estado,
  registros,
  periodoCerrado,
}: {
  seguimiento: { id: string; numero: number; fechaInicio: Date; fechaFin: Date };
  estado: EstadoFranja;
  registros: number;
  periodoCerrado: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function eliminar() {
    setError(null);
    startTransition(async () => {
      const resultado = await accionEliminarSeguimiento(seguimiento.id);
      if (!resultado.ok) {
        setError(resultado.error);
        setConfirmandoBorrado(false);
      }
    });
  }

  if (editando) {
    return (
      <div className="flex flex-col gap-2 rounded-md bg-iib-surface-sunken px-3 py-2.5">
        <p className="text-xs font-semibold text-iib-foreground">Seguimiento {seguimiento.numero}</p>
        <FranjaFechasForm
          inicioInicial={seguimiento.fechaInicio.toISOString().slice(0, 10)}
          finInicial={seguimiento.fechaFin.toISOString().slice(0, 10)}
          etiquetaGuardar="Guardar"
          etiquetaGuardando="Guardando…"
          onCancelar={() => setEditando(false)}
          onGuardar={async (fechaInicio, fechaFin) => {
            const resultado = await accionEditarSeguimiento({
              seguimientoId: seguimiento.id,
              fechaInicio,
              fechaFin,
            });
            if (resultado.ok) setEditando(false);
            return resultado;
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-md bg-iib-surface-sunken px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-iib-foreground">
          <strong className="font-semibold">Seguimiento {seguimiento.numero}</strong>
          <span className="text-iib-secondary">
            {" "}
            · del {formatearFecha(seguimiento.fechaInicio)} al {formatearFecha(seguimiento.fechaFin)}
          </span>
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${CLASES_ESTADO[estado]}`}>
            {ETIQUETA_ESTADO[estado]}
          </span>
          {!periodoCerrado && (
            <>
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="rounded-md border border-iib-border px-2.5 py-1 text-xs font-medium transition hover:bg-iib-surface"
              >
                Editar fechas
              </button>
              {registros === 0 &&
                (confirmandoBorrado ? (
                  <>
                    <span className="text-xs text-iib-secondary">¿Eliminar?</span>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={eliminar}
                      className="rounded-md border border-danger/40 px-2.5 py-1 text-xs font-semibold text-danger transition hover:bg-danger-bg disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pending ? "Eliminando…" : "Sí, eliminar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmandoBorrado(false)}
                      className="rounded-md border border-iib-border px-2.5 py-1 text-xs font-medium transition hover:bg-iib-surface"
                    >
                      No
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmandoBorrado(true)}
                    className="rounded-md border border-danger/40 px-2.5 py-1 text-xs font-medium text-danger transition hover:bg-danger-bg"
                  >
                    Eliminar
                  </button>
                ))}
            </>
          )}
        </div>
      </div>
      {registros > 0 && (
        <p className="text-xs text-iib-secondary">
          {registros} registro{registros === 1 ? "" : "s"} guardado{registros === 1 ? "" : "s"}
        </p>
      )}
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
