"use client";

import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";
import { Chip, type TonoChip } from "@/components/ui/Chip";
import { formatearFecha } from "@/lib/fecha";
import type { EstadoFranja } from "@/lib/franja";
import { accionEditarSeguimiento, accionEliminarSeguimiento } from "./actions";
import { FranjaFechasForm } from "./FranjaFechasForm";

const ETIQUETA_ESTADO: Record<EstadoFranja, string> = {
  PROXIMA: "Próximo",
  EN_CURSO: "En curso",
  FINALIZADA: "Finalizado",
};

const TONO_ESTADO: Record<EstadoFranja, TonoChip> = {
  PROXIMA: "neutro",
  EN_CURSO: "exito",
  FINALIZADA: "neutro",
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
          <Chip tono={TONO_ESTADO[estado]}>{ETIQUETA_ESTADO[estado]}</Chip>
          {!periodoCerrado && (
            <>
              <Boton variante="secundario" tamano="sm" onClick={() => setEditando(true)}>
                Editar fechas
              </Boton>
              {registros === 0 &&
                (confirmandoBorrado ? (
                  <>
                    <span className="text-xs text-iib-secondary">¿Eliminar?</span>
                    <Boton variante="peligro" tamano="sm" disabled={pending} onClick={eliminar}>
                      {pending ? "Eliminando…" : "Sí, eliminar"}
                    </Boton>
                    <Boton variante="secundario" tamano="sm" onClick={() => setConfirmandoBorrado(false)}>
                      No
                    </Boton>
                  </>
                ) : (
                  <Boton variante="peligro" tamano="sm" onClick={() => setConfirmandoBorrado(true)}>
                    Eliminar
                  </Boton>
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
