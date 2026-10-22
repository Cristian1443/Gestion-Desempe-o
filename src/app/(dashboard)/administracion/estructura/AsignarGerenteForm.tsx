"use client";

import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";
import { accionAsignarGerente } from "./actions";

export function AsignarGerenteForm({
  gerenciaId,
  usuarios,
}: {
  gerenciaId: string;
  usuarios: Array<{ id: string; nombre: string }>;
}) {
  const [usuarioId, setUsuarioId] = useState(usuarios[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar() {
    if (!usuarioId) return;
    setError(null);
    startTransition(async () => {
      const resultado = await accionAsignarGerente(gerenciaId, usuarioId);
      if (!resultado.ok) setError(resultado.error);
    });
  }

  if (usuarios.length === 0) {
    return <p className="text-xs text-iib-secondary">No hay usuarios activos para asignar.</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={usuarioId}
          onChange={(e) => setUsuarioId(e.target.value)}
          className="flex-1 rounded-md border border-iib-border bg-iib-background px-2.5 py-1.5 text-sm"
        >
          {usuarios.map((usuario) => (
            <option key={usuario.id} value={usuario.id}>
              {usuario.nombre}
            </option>
          ))}
        </select>
        <Boton variante="secundario" onClick={enviar} disabled={pending}>
          {pending ? "Asignando…" : "Asignar como gerente"}
        </Boton>
      </div>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
