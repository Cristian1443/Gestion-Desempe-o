"use client";

import { useId, useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";

type Resultado = { ok: true } | { ok: false; error: string };

// Formulario de una franja: fecha de inicio y de fin (inclusivas). Lo usan
// agregar y editar un seguimiento, y definir la franja del % de cumplimiento.
export function FranjaFechasForm({
  inicioInicial = "",
  finInicial = "",
  etiquetaGuardar,
  etiquetaGuardando,
  limpiarAlExito = false,
  onGuardar,
  onCancelar,
}: {
  inicioInicial?: string;
  finInicial?: string;
  etiquetaGuardar: string;
  etiquetaGuardando: string;
  limpiarAlExito?: boolean;
  onGuardar: (fechaInicio: string, fechaFin: string) => Promise<Resultado>;
  onCancelar?: () => void;
}) {
  const id = useId();
  const [inicio, setInicio] = useState(inicioInicial);
  const [fin, setFin] = useState(finInicial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar() {
    setError(null);
    startTransition(async () => {
      const resultado = await onGuardar(inicio, fin);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      if (limpiarAlExito) {
        setInicio("");
        setFin("");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2.5">
        <label htmlFor={`${id}-inicio`} className="flex flex-col gap-1 text-xs font-medium text-iib-secondary">
          Desde
          <input
            id={`${id}-inicio`}
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className="rounded-md border border-iib-border bg-iib-background px-2.5 py-1.5 text-sm text-iib-foreground"
          />
        </label>
        <label htmlFor={`${id}-fin`} className="flex flex-col gap-1 text-xs font-medium text-iib-secondary">
          Hasta
          <input
            id={`${id}-fin`}
            type="date"
            value={fin}
            onChange={(e) => setFin(e.target.value)}
            className="rounded-md border border-iib-border bg-iib-background px-2.5 py-1.5 text-sm text-iib-foreground"
          />
        </label>
        <Boton variante="secundario" onClick={enviar} disabled={pending || !inicio || !fin}>
          {pending ? etiquetaGuardando : etiquetaGuardar}
        </Boton>
        {onCancelar && (
          <Boton variante="fantasma" onClick={onCancelar}>
            Cancelar
          </Boton>
        )}
      </div>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
