"use client";

import { useEffect, useState, useTransition } from "react";
import { CODIGOS_LINEA_INDICADOR, textoLinea } from "@/lib/indicadores-config";
import type { DatosFormularioIndicador } from "./FormularioIndicador";

type Resultado = { ok: true } | { ok: false; error: string };

const VACIA: DatosFormularioIndicador = { lineaEstrategica: "", descripcion: "", titulo: "", meta: "" };

// Los de la gerencia llevan el color del componente 2 (ámbar) y los de la empresa el del 3 (verde),
// los mismos de las tarjetas de "Metas individuales".
const TONOS = {
  gerencia: {
    banda: "bg-amber-50",
    numero: "bg-amber-700",
    pildora: "bg-amber-700",
    etiqueta: "Gerencia",
  },
  empresa: {
    banda: "bg-emerald-50",
    numero: "bg-emerald-700",
    pildora: "bg-emerald-700",
    etiqueta: "Empresa",
  },
} as const;

const estiloInput =
  "rounded-md border border-iib-border bg-iib-surface px-2.5 py-2 text-sm shadow-sm transition focus:border-iib-primary focus:outline-none focus:ring-2 focus:ring-iib-primary/15";
const estiloLabel = "text-xs font-bold text-iib-secondary";
const estiloCampo = "flex flex-col gap-1";

const esVacia = (d: DatosFormularioIndicador) => Object.values(d).every((v) => v.trim() === "");
const esCompleta = (d: DatosFormularioIndicador) => Object.values(d).every((v) => v.trim() !== "");

function TarjetaIndicador({
  fila,
  numero,
  tono,
  peso,
  onCambiar,
}: {
  fila: DatosFormularioIndicador;
  numero: number;
  tono: keyof typeof TONOS;
  peso: number;
  onCambiar: (campo: keyof DatosFormularioIndicador, valor: string) => void;
}) {
  const color = TONOS[tono];
  return (
    <article className="overflow-hidden rounded-card border border-iib-border bg-iib-surface shadow-card">
      <div className={`flex flex-wrap items-center gap-3 border-b border-iib-border px-4 py-3 ${color.banda}`}>
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${color.numero}`}
        >
          {numero}
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-white ${color.pildora}`}
        >
          {color.etiqueta}
        </span>
        <select
          value={fila.lineaEstrategica}
          onChange={(e) => onCambiar("lineaEstrategica", e.target.value)}
          aria-label="Línea estratégica"
          className="min-w-[14rem] flex-1 rounded-md border border-iib-border bg-iib-surface px-2.5 py-1.5 text-sm font-medium"
        >
          <option value="">Selecciona una línea estratégica</option>
          {CODIGOS_LINEA_INDICADOR.map((codigo) => (
            <option key={codigo} value={codigo}>
              {textoLinea(codigo)}
            </option>
          ))}
        </select>
        <span className="ml-auto shrink-0 rounded-full bg-iib-surface px-3 py-1 text-xs font-bold tabular-nums text-iib-secondary">
          Peso {peso} %
        </span>
      </div>

      <div className="flex flex-col gap-3.5 p-4">
        <div className={estiloCampo}>
          <label className={estiloLabel}>Objetivo estratégico</label>
          <textarea
            rows={3}
            value={fila.descripcion}
            onChange={(e) => onCambiar("descripcion", e.target.value)}
            placeholder="ej. Facilitar proyectos de inversión."
            className={`${estiloInput} resize-y`}
          />
        </div>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[1fr_14rem]">
          <div className={estiloCampo}>
            <label className={estiloLabel}>Indicador estratégico</label>
            <input
              value={fila.titulo}
              onChange={(e) => onCambiar("titulo", e.target.value)}
              placeholder="ej. # Proyectos facilitados"
              className={estiloInput}
            />
          </div>
          <div className={estiloCampo}>
            <label className={estiloLabel}>Meta</label>
            <input
              value={fila.meta}
              onChange={(e) => onCambiar("meta", e.target.value)}
              placeholder="ej. 47, o N/A"
              className={estiloInput}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

// Carga de los indicadores que faltan (los 2 de la gerencia o los 8 de la empresa): todas las
// tarjetas salen de una vez, con el mismo diseño que la carga de metas individuales, y un solo
// botón guarda las que ya están completas. La Server Action que crea cada uno llega por prop.
export function CargarIndicadores({
  faltan,
  cargados,
  tono,
  peso,
  accion,
}: {
  faltan: number;
  // Cuántos ya están cargados: sirve para seguir la numeración.
  cargados: number;
  tono: keyof typeof TONOS;
  // Peso (%) de cada indicador, solo informativo: lo pone el sistema.
  peso: number;
  accion: (datos: DatosFormularioIndicador) => Promise<Resultado>;
}) {
  const [filas, setFilas] = useState<DatosFormularioIndicador[]>(() =>
    Array.from({ length: faltan }, () => ({ ...VACIA })),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Si cambia cuántos faltan (por ejemplo, otra persona eliminó uno), se ajustan las tarjetas.
  useEffect(() => {
    setFilas((prev) => {
      if (prev.length === faltan) return prev;
      if (prev.length < faltan) return [...prev, ...Array.from({ length: faltan - prev.length }, () => ({ ...VACIA }))];
      return prev.slice(0, faltan);
    });
  }, [faltan]);

  if (faltan === 0 || filas.length === 0) return null;

  const completas = filas.filter(esCompleta).length;
  const incompletas = filas.filter((f) => !esVacia(f) && !esCompleta(f)).length;
  const puedeGuardar = completas > 0 && incompletas === 0;

  function cambiar(indice: number, campo: keyof DatosFormularioIndicador, valor: string) {
    setFilas((prev) => prev.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f)));
  }

  function guardar() {
    setError(null);
    startTransition(async () => {
      // Se guardan en orden; las que se guardan salen de la lista y, si una falla, ahí se detiene.
      const pendientes = [...filas];
      for (let i = 0; i < pendientes.length; i++) {
        const fila = pendientes[i]!;
        if (!esCompleta(fila)) continue;
        const resultado = await accion(fila);
        if (!resultado.ok) {
          setError(`${resultado.error} (indicador ${cargados + i + 1})`);
          return;
        }
        setFilas((prev) => prev.filter((f) => f !== fila));
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        {filas.map((fila, indice) => (
          <TarjetaIndicador
            key={indice}
            fila={fila}
            numero={cargados + indice + 1}
            tono={tono}
            peso={peso}
            onCambiar={(campo, valor) => cambiar(indice, campo, valor)}
          />
        ))}
      </div>

      {error && <p className="text-sm font-medium text-danger">{error}</p>}

      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
        {!puedeGuardar && (
          <p className="text-sm text-warning">
            {incompletas > 0
              ? "Completa la línea estratégica, el objetivo, el indicador y la meta de cada tarjeta que empezaste."
              : "Completa al menos un indicador para poder guardar."}
          </p>
        )}
        <button
          type="button"
          onClick={guardar}
          disabled={pending || !puedeGuardar}
          className="rounded-md bg-iib-primary px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-iib-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Guardando…" : completas > 1 ? `Guardar ${completas} indicadores` : "Guardar indicador"}
        </button>
      </div>
    </div>
  );
}
