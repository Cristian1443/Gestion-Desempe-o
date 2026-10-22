"use client";

import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";

type Resultado = { ok: true } | { ok: false; error: string };

// Resultado final del indicador (de la empresa o de gerencia). Quien edita lo
// marca dentro de la franja del % de cumplimiento; fuera de ella (o para los
// demás) es solo lectura. La Server Action que valida y guarda llega por prop.
export function CumplimientoControl({
  objetivoId,
  cumplido,
  accion,
}: {
  objetivoId: string;
  cumplido: boolean | null;
  accion: (objetivoId: string, cumple: boolean) => Promise<Resultado>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function marcar(cumple: boolean) {
    setError(null);
    startTransition(async () => {
      const resultado = await accion(objetivoId, cumple);
      if (!resultado.ok) setError(resultado.error);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-iib-secondary">Resultado final</span>
        <Boton
          variante="secundario"
          tamano="sm"
          disabled={pending}
          onClick={() => marcar(true)}
          aria-pressed={cumplido === true}
          className={cumplido === true ? "!border-success !bg-success !text-white" : ""}
        >
          Cumple
        </Boton>
        <Boton
          variante="secundario"
          tamano="sm"
          disabled={pending}
          onClick={() => marcar(false)}
          aria-pressed={cumplido === false}
          className={cumplido === false ? "!border-danger !bg-danger !text-white" : ""}
        >
          No cumple
        </Boton>
      </div>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
