"use client";

import { useId, useState, useTransition } from "react";
import {
  CODIGOS_LINEA_INDICADOR,
  ETIQUETA_TIPO_INDICADOR,
  TIPOS_INDICADOR,
  textoLinea,
} from "@/lib/indicadores-config";

// Campos de un indicador (de la empresa o de gerencia). Los tres de texto llevan
// el nombre que tienen en la base de datos: `descripcion` es el objetivo estratégico
// y `titulo` es el indicador.
export interface DatosFormularioIndicador {
  lineaEstrategica: string;
  descripcion: string;
  tipoIndicador: string;
  titulo: string;
  meta: string;
}

const VACIO: DatosFormularioIndicador = { lineaEstrategica: "", descripcion: "", tipoIndicador: "", titulo: "", meta: "" };

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
      <label htmlFor={`${id}-linea`} className="flex flex-col gap-1 text-xs font-medium text-iib-secondary">
        Línea estratégica
        <select
          id={`${id}-linea`}
          value={datos.lineaEstrategica}
          onChange={(e) => cambiar("lineaEstrategica", e.target.value)}
          className={estiloCampo}
        >
          <option value="">Selecciona una línea estratégica</option>
          {CODIGOS_LINEA_INDICADOR.map((codigo) => (
            <option key={codigo} value={codigo}>
              {textoLinea(codigo)}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor={`${id}-objetivo`} className="flex flex-col gap-1 text-xs font-medium text-iib-secondary">
        Objetivo estratégico
        <textarea
          id={`${id}-objetivo`}
          rows={3}
          value={datos.descripcion}
          onChange={(e) => cambiar("descripcion", e.target.value)}
          placeholder="ej. Facilitar proyectos de inversión."
          className={`${estiloCampo} resize-y`}
        />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[14rem_1fr]">
        <label htmlFor={`${id}-tipo`} className="flex flex-col gap-1 text-xs font-medium text-iib-secondary">
          Tipo de indicador
          <select
            id={`${id}-tipo`}
            value={datos.tipoIndicador}
            onChange={(e) => cambiar("tipoIndicador", e.target.value)}
            className={estiloCampo}
          >
            <option value="">Selecciona el tipo</option>
            {TIPOS_INDICADOR.map((tipo) => (
              <option key={tipo} value={tipo}>
                {ETIQUETA_TIPO_INDICADOR[tipo]}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={`${id}-indicador`} className="flex flex-col gap-1 text-xs font-medium text-iib-secondary">
          {datos.tipoIndicador === "GESTION" ? "Indicador de gestión" : "Indicador estratégico"}
          <input
            id={`${id}-indicador`}
            value={datos.titulo}
            onChange={(e) => cambiar("titulo", e.target.value)}
            placeholder="ej. # Proyectos facilitados"
            className={estiloCampo}
          />
        </label>
      </div>
      <label htmlFor={`${id}-meta`} className="flex flex-col gap-1 text-xs font-medium text-iib-secondary sm:max-w-[14rem]">
        Meta
        <input
          id={`${id}-meta`}
          value={datos.meta}
          onChange={(e) => cambiar("meta", e.target.value)}
          placeholder="ej. 47, o N/A"
          className={estiloCampo}
        />
      </label>

      {error && <p className="text-xs font-medium text-danger">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-md border border-iib-border px-3 py-1.5 text-sm font-medium transition hover:bg-iib-surface-sunken"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={pending || !completo}
          onClick={enviar}
          className="rounded-md bg-iib-primary px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-iib-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Guardando…" : etiquetaGuardar}
        </button>
      </div>
    </div>
  );
}
