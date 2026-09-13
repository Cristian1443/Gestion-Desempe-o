"use client";

import { useState, useTransition } from "react";
import { formatearFecha } from "@/lib/fecha";
import { accionAbrirCorte, accionCerrarCorte, accionEditarCorte, accionEliminarCorte } from "./actions";

const ETIQUETA_ESTADO: Record<string, string> = {
  BORRADOR: "Borrador",
  ABIERTO: "Abierto",
  EN_EVALUACION: "En evaluación",
  CERRADO: "Cerrado",
};

const CLASES_ESTADO: Record<string, string> = {
  BORRADOR: "bg-iib-surface-sunken text-iib-secondary",
  ABIERTO: "bg-success-bg text-success",
  EN_EVALUACION: "bg-warning-bg text-warning",
  CERRADO: "bg-iib-surface-sunken text-iib-secondary",
};

export function CorteRow({
  corte,
}: {
  corte: { id: string; numero: number; nombre: string; fechaLimite: Date; estado: string };
}) {
  const [editando, setEditando] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [nombre, setNombre] = useState(corte.nombre);
  const [fechaLimite, setFechaLimite] = useState(corte.fechaLimite.toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function guardar() {
    setError(null);
    startTransition(async () => {
      const resultado = await accionEditarCorte({ corteId: corte.id, nombre, fechaLimite });
      if (!resultado.ok) {
        setError(resultado.error);
      } else {
        setEditando(false);
      }
    });
  }

  function eliminar() {
    setError(null);
    startTransition(async () => {
      const resultado = await accionEliminarCorte(corte.id);
      if (!resultado.ok) {
        setError(resultado.error);
        setConfirmandoBorrado(false);
      }
    });
  }

  if (editando) {
    return (
      <div className="flex flex-col gap-2 rounded-md bg-iib-surface-sunken px-3 py-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del corte"
            className="rounded-md border border-iib-border bg-iib-background px-2.5 py-1.5 text-sm"
          />
          <input
            type="date"
            value={fechaLimite}
            onChange={(e) => setFechaLimite(e.target.value)}
            className="rounded-md border border-iib-border bg-iib-background px-2.5 py-1.5 text-sm"
          />
        </div>
        {error && <p className="text-xs font-medium text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setNombre(corte.nombre);
              setFechaLimite(corte.fechaLimite.toISOString().slice(0, 10));
              setEditando(false);
            }}
            className="rounded-md border border-iib-border px-3 py-1.5 text-sm font-medium transition hover:bg-iib-surface"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending || !nombre || !fechaLimite}
            onClick={guardar}
            className="rounded-md bg-iib-primary px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-iib-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-md bg-iib-surface-sunken px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-iib-secondary">
          {corte.nombre} · vence {formatearFecha(corte.fechaLimite)}
        </span>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${CLASES_ESTADO[corte.estado]}`}>
            {ETIQUETA_ESTADO[corte.estado]}
          </span>
          {corte.estado === "BORRADOR" && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const resultado = await accionAbrirCorte(corte.id);
                  if (!resultado.ok) setError(resultado.error);
                })
              }
              className="rounded-md border border-iib-border px-2.5 py-1 text-xs font-medium transition hover:bg-iib-surface disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Abriendo…" : "Abrir corte"}
            </button>
          )}
          {corte.estado === "ABIERTO" && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const resultado = await accionCerrarCorte(corte.id);
                  if (!resultado.ok) setError(resultado.error);
                })
              }
              className="rounded-md border border-iib-border px-2.5 py-1 text-xs font-medium transition hover:bg-iib-surface disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Cerrando…" : "Cerrar corte"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="rounded-md border border-iib-border px-2.5 py-1 text-xs font-medium transition hover:bg-iib-surface"
          >
            Editar
          </button>
          {confirmandoBorrado ? (
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
          )}
        </div>
      </div>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
