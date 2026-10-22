"use client";

import { useId, useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";

export interface DatosFormularioIndicador {
  titulo: string;
  descripcion: string;
  meta: string;
  unidadMedida: string;
  indicador: string;
}

const VACIO: DatosFormularioIndicador = { titulo: "", descripcion: "", meta: "", unidadMedida: "", indicador: "" };

type Resultado = { ok: true } | { ok: false; error: string };

// Campos de un indicador, compartidos por "Agregar" y "Editar".
export function FormularioIndicador({
  inicial = VACIO,
  etiquetaGuardar,
  onGuardar,
  onCancelar,
}: {
  inicial?: DatosFormularioIndicador;
  etiquetaGuardar: string;
  onGuardar: (datos: DatosFormularioIndicador) => Promise<Resultado>;
  onCancelar: () => void;
}) {
  const id = useId();
  const [datos, setDatos] = useState(inicial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function cambiar(campo: keyof DatosFormularioIndicador, valor: string) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  function enviar() {
    setError(null);
    startTransition(async () => {
      const resultado = await onGuardar(datos);
      if (!resultado.ok) setError(resultado.error);
    });
  }

  const completo = Object.values(datos).every((v) => v.trim() !== "");
  const estiloCampo =
    "rounded-md border border-iib-border bg-iib-background px-2.5 py-2 text-sm text-iib-foreground";

  return (
    <div className="flex flex-col gap-3 rounded-md border border-iib-border p-4">
      <label htmlFor={`${id}-titulo`} className="flex flex-col gap-1 text-xs font-medium text-iib-secondary">
        Nombre del indicador
        <input id={`${id}-titulo`} value={datos.titulo} onChange={(e) => cambiar("titulo", e.target.value)} className={estiloCampo} />
      </label>
      <label htmlFor={`${id}-descripcion`} className="flex flex-col gap-1 text-xs font-medium text-iib-secondary">
        Descripción
        <textarea
          id={`${id}-descripcion`}
          rows={3}
          value={datos.descripcion}
          onChange={(e) => cambiar("descripcion", e.target.value)}
          className={`${estiloCampo} resize-y`}
        />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label htmlFor={`${id}-meta`} className="flex flex-col gap-1 text-xs font-medium text-iib-secondary">
          Meta
          <input id={`${id}-meta`} value={datos.meta} onChange={(e) => cambiar("meta", e.target.value)} className={estiloCampo} />
        </label>
        <label htmlFor={`${id}-unidad`} className="flex flex-col gap-1 text-xs font-medium text-iib-secondary">
          Unidad de medida
          <input
            id={`${id}-unidad`}
            value={datos.unidadMedida}
            onChange={(e) => cambiar("unidadMedida", e.target.value)}
            placeholder="ej. %, proyectos, USD"
            className={estiloCampo}
          />
        </label>
      </div>
      <label htmlFor={`${id}-indicador`} className="flex flex-col gap-1 text-xs font-medium text-iib-secondary">
        Cómo se mide
        <input
          id={`${id}-indicador`}
          value={datos.indicador}
          onChange={(e) => cambiar("indicador", e.target.value)}
          placeholder="Fórmula o criterio con el que se calcula"
          className={estiloCampo}
        />
      </label>

      {error && <p className="text-xs font-medium text-danger">{error}</p>}

      <div className="flex justify-end gap-2">
        <Boton variante="secundario" onClick={onCancelar}>
          Cancelar
        </Boton>
        <Boton disabled={pending || !completo} onClick={enviar}>
          {pending ? "Guardando…" : etiquetaGuardar}
        </Boton>
      </div>
    </div>
  );
}
