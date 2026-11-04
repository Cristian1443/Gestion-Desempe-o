"use client";

import { useId, useState, useTransition } from "react";
import { formatearFecha } from "@/lib/fecha";
import {
  accionAgregarActividad,
  accionEditarActividad,
  accionEliminarActividad,
  type EstadoAccionAdmin,
} from "./actions";

type Actividad = { id: string; nombre: string; fechaInicio: Date; fechaFin: Date };

const estiloInput =
  "rounded-md border border-iib-border bg-iib-background px-2.5 py-1.5 text-sm text-iib-foreground";

// Nombre + fechas de una actividad. Sirve para agregar y para editar.
function FormularioActividad({
  inicial,
  etiquetaGuardar,
  limpiarAlExito = false,
  onGuardar,
  onCancelar,
}: {
  inicial?: { nombre: string; inicio: string; fin: string };
  etiquetaGuardar: string;
  limpiarAlExito?: boolean;
  onGuardar: (datos: { nombre: string; fechaInicio: string; fechaFin: string }) => Promise<EstadoAccionAdmin>;
  onCancelar?: () => void;
}) {
  const id = useId();
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [inicio, setInicio] = useState(inicial?.inicio ?? "");
  const [fin, setFin] = useState(inicial?.fin ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar() {
    setError(null);
    startTransition(async () => {
      const resultado = await onGuardar({ nombre, fechaInicio: inicio, fechaFin: fin });
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      if (limpiarAlExito) {
        setNombre("");
        setInicio("");
        setFin("");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2.5">
        <label htmlFor={`${id}-nombre`} className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs font-medium text-iib-secondary">
          Actividad
          <input
            id={`${id}-nombre`}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="ej. Carga de evidencia"
            maxLength={100}
            className={estiloInput}
          />
        </label>
        <label htmlFor={`${id}-inicio`} className="flex flex-col gap-1 text-xs font-medium text-iib-secondary">
          Desde
          <input id={`${id}-inicio`} type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className={estiloInput} />
        </label>
        <label htmlFor={`${id}-fin`} className="flex flex-col gap-1 text-xs font-medium text-iib-secondary">
          Hasta
          <input id={`${id}-fin`} type="date" value={fin} onChange={(e) => setFin(e.target.value)} className={estiloInput} />
        </label>
        <button
          type="button"
          onClick={enviar}
          disabled={pending || !nombre.trim() || !inicio || !fin}
          className="rounded-md border border-iib-border px-3 py-1.5 text-sm font-medium transition hover:bg-iib-surface-sunken disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Guardando…" : etiquetaGuardar}
        </button>
        {onCancelar && (
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-md border border-iib-border px-3 py-1.5 text-sm font-medium transition hover:bg-iib-surface"
          >
            Cancelar
          </button>
        )}
      </div>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

function FilaActividad({ actividad, periodoCerrado }: { actividad: Actividad; periodoCerrado: boolean }) {
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function eliminar() {
    setError(null);
    startTransition(async () => {
      const resultado = await accionEliminarActividad(actividad.id);
      if (!resultado.ok) {
        setError(resultado.error);
        setConfirmando(false);
      }
    });
  }

  if (editando) {
    return (
      <div className="rounded-md bg-iib-surface-sunken px-3 py-2.5">
        <FormularioActividad
          inicial={{
            nombre: actividad.nombre,
            inicio: actividad.fechaInicio.toISOString().slice(0, 10),
            fin: actividad.fechaFin.toISOString().slice(0, 10),
          }}
          etiquetaGuardar="Guardar"
          onCancelar={() => setEditando(false)}
          onGuardar={async (datos) => {
            const resultado = await accionEditarActividad({ actividadId: actividad.id, ...datos });
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
          <strong className="font-semibold">{actividad.nombre}</strong>
          <span className="text-iib-secondary">
            {" "}
            · del {formatearFecha(actividad.fechaInicio)} al {formatearFecha(actividad.fechaFin)}
          </span>
        </span>
        {!periodoCerrado && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="rounded-md border border-iib-border px-2.5 py-1 text-xs font-medium transition hover:bg-iib-surface"
            >
              Editar
            </button>
            {confirmando ? (
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
                  onClick={() => setConfirmando(false)}
                  className="rounded-md border border-iib-border px-2.5 py-1 text-xs font-medium transition hover:bg-iib-surface"
                >
                  No
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmando(true)}
                className="rounded-md border border-danger/40 px-2.5 py-1 text-xs font-medium text-danger transition hover:bg-danger-bg"
              >
                Eliminar
              </button>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

// Otras actividades del cronograma del periodo. Los seguimientos y el resultado final
// ya aparecen en el cronograma con las fechas de arriba.
export function ActividadesCronograma({
  periodoId,
  actividades,
  periodoCerrado,
}: {
  periodoId: string;
  actividades: Actividad[];
  periodoCerrado: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-wide text-iib-secondary">Otras actividades del cronograma</p>
      <p className="text-xs text-iib-secondary">
        Se muestran a todos en Metas individuales, junto con los seguimientos y el resultado final. Son informativas:
        no bloquean ninguna acción.
      </p>
      {actividades.length === 0 ? (
        <p className="text-xs text-iib-secondary">Todavía no hay actividades.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {actividades.map((actividad) => (
            <FilaActividad key={actividad.id} actividad={actividad} periodoCerrado={periodoCerrado} />
          ))}
        </div>
      )}
      {!periodoCerrado && (
        <FormularioActividad
          etiquetaGuardar="Agregar actividad"
          limpiarAlExito
          onGuardar={(datos) => accionAgregarActividad({ periodoId, ...datos })}
        />
      )}
    </div>
  );
}
