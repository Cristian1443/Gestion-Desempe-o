"use client";

import { useState, useTransition } from "react";
type Resultado = { ok: true } | { ok: false; error: string };
import { FormularioIndicador, type DatosFormularioIndicador } from "./FormularioIndicador";

// Editar y eliminar un indicador (de la empresa o de gerencia). Eliminar solo se
// ofrece mientras no tenga avances ni resultado. Las Server Actions llegan por prop.
export function AccionesIndicador({
  objetivoId,
  datos,
  puedeEliminar,
  accionEditar,
  accionEliminar,
}: {
  objetivoId: string;
  datos: DatosFormularioIndicador;
  puedeEliminar: boolean;
  accionEditar: (input: DatosFormularioIndicador & { objetivoId: string }) => Promise<Resultado>;
  accionEliminar: (objetivoId: string) => Promise<Resultado>;
}) {
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function eliminar() {
    setError(null);
    startTransition(async () => {
      const resultado = await accionEliminar(objetivoId);
      if (!resultado.ok) {
        setError(resultado.error);
        setConfirmando(false);
      }
    });
  }

  if (editando) {
    return (
      <FormularioIndicador
        inicial={datos}
        etiquetaGuardar="Guardar cambios"
        onCancelar={() => setEditando(false)}
        onGuardar={async (nuevos) => {
          const resultado = await accionEditar({ objetivoId, ...nuevos });
          if (resultado.ok) setEditando(false);
          return resultado;
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="rounded-md border border-iib-border px-2.5 py-1 text-xs font-medium transition hover:bg-iib-surface-sunken"
        >
          Editar
        </button>
        {puedeEliminar &&
          (confirmando ? (
            <>
              <span className="text-xs text-iib-secondary">¿Eliminar este indicador?</span>
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
                className="rounded-md border border-iib-border px-2.5 py-1 text-xs font-medium transition hover:bg-iib-surface-sunken"
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
          ))}
      </div>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
