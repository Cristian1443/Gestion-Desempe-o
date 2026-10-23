"use client";

import { useState, useTransition } from "react";
import { LINEAS_ESTRATEGICAS, CODIGOS_LINEA_ESTRATEGICA } from "@/lib/lineas-estrategicas";
import { CANTIDAD_DESARROLLO_ACTIVA, PESO_TOTAL_INDIVIDUALES } from "@/lib/objetivos-config";
import { CANTIDAD_OBJETIVOS_DESEMPENO, distribuirPesoEquitativo } from "@/server/services/calculo-notas";
import type { ObjetivoVista } from "@/server/services/objetivos.service";
import { accionProponerObjetivos } from "./actions";

type FilaDesempeno = {
  lineaEstrategica: string;
  descripcion: string;
  acciones: string;
  indicador: string;
  meta: string;
  peso: number;
  linkRepositorio: string;
};

type FilaDesarrollo = {
  competencia: string;
  descripcion: string;
  acciones: string;
  indicador: string;
  linkRepositorio: string;
};

function filaDesempenoVacia(): FilaDesempeno {
  return { lineaEstrategica: "", descripcion: "", acciones: "", indicador: "", meta: "", peso: 0, linkRepositorio: "" };
}

function filaDesarrolloVacia(): FilaDesarrollo {
  return { competencia: "", descripcion: "", acciones: "", indicador: "", linkRepositorio: "" };
}

// Cuando el jefe devuelve la propuesta, el formulario debe llegar precargado
// con lo que ya se había escrito — para que el colaborador solo corrija lo
// señalado, no que vuelva a redactar los 6 objetivos desde cero.
function desempenoDesdeAnterior(objetivos: ObjetivoVista[]): FilaDesempeno[] {
  const previos = objetivos
    .filter((o) => o.tipoIndividual === "DESEMPENO")
    .map(
      (o): FilaDesempeno => ({
        lineaEstrategica: o.lineaEstrategica ?? "",
        descripcion: o.descripcion,
        acciones: o.acciones ?? "",
        indicador: o.indicador,
        meta: o.meta ?? "",
        peso: o.peso,
        linkRepositorio: o.linkRepositorio ?? "",
      }),
    );
  return Array.from(
    { length: CANTIDAD_OBJETIVOS_DESEMPENO },
    (_, i) => previos[i] ?? filaDesempenoVacia(),
  );
}

function desarrolloDesdeAnterior(objetivos: ObjetivoVista[]): FilaDesarrollo[] {
  const previos = objetivos
    .filter((o) => o.tipoIndividual === "DESARROLLO")
    .map(
      (o): FilaDesarrollo => ({
        competencia: o.competencia ?? "",
        descripcion: o.descripcion,
        acciones: o.acciones ?? "",
        indicador: o.indicador,
        linkRepositorio: o.linkRepositorio ?? "",
      }),
    );
  return Array.from(
    { length: CANTIDAD_DESARROLLO_ACTIVA },
    (_, i) => previos[i] ?? filaDesarrolloVacia(),
  );
}

const estiloInput =
  "rounded-md border border-iib-border bg-iib-surface px-2.5 py-2 text-sm shadow-sm transition focus:border-iib-primary focus:outline-none focus:ring-2 focus:ring-iib-primary/15";
const estiloLabel = "text-xs font-semibold text-iib-secondary";
const estiloCampo = "flex flex-col gap-1";

function TarjetaDesempeno({
  fila,
  numero,
  onCambiar,
}: {
  fila: FilaDesempeno;
  numero: number;
  onCambiar: (campo: keyof FilaDesempeno, valor: string) => void;
}) {
  return (
    <article className="overflow-hidden rounded-card border border-iib-border bg-iib-surface shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-iib-border bg-iib-primary/[0.06] px-4 py-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-iib-primary text-xs font-bold text-white">
          {numero}
        </span>
        <span className="shrink-0 rounded-full bg-iib-primary px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-white">
          Desempeño
        </span>
        <select
          value={fila.lineaEstrategica}
          onChange={(e) => onCambiar("lineaEstrategica", e.target.value)}
          className="min-w-[14rem] flex-1 rounded-md border border-iib-border bg-iib-surface px-2.5 py-1.5 text-sm font-medium"
        >
          <option value="">Selecciona una línea estratégica</option>
          {CODIGOS_LINEA_ESTRATEGICA.map((codigo) => (
            <option key={codigo} value={codigo}>
              {LINEAS_ESTRATEGICAS[codigo]}
            </option>
          ))}
        </select>
        <label className="ml-auto flex shrink-0 items-center gap-1.5 text-xs font-semibold text-iib-secondary">
          Peso
          <input
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={fila.peso}
            onChange={(e) => onCambiar("peso", e.target.value)}
            className="w-20 rounded-md border border-iib-border bg-iib-surface px-2 py-1.5 text-sm font-bold tabular-nums"
          />
          %
        </label>
      </div>

      <div className="flex flex-col gap-3.5 p-4">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className={estiloCampo}>
            <label className={estiloLabel}>Descripción del objetivo</label>
            <textarea
              value={fila.descripcion}
              onChange={(e) => onCambiar("descripcion", e.target.value)}
              placeholder="¿Qué se busca lograr con este objetivo?"
              rows={3}
              className={`resize-y ${estiloInput}`}
            />
          </div>
          <div className={estiloCampo}>
            <label className={estiloLabel}>Acciones</label>
            <textarea
              value={fila.acciones}
              onChange={(e) => onCambiar("acciones", e.target.value)}
              placeholder="¿Cómo se va a lograr? Pasos o actividades concretas"
              rows={3}
              className={`resize-y ${estiloInput}`}
            />
          </div>
        </div>

        <div className={estiloCampo}>
          <label className={estiloLabel}>Fórmula del indicador</label>
          <textarea
            value={fila.indicador}
            onChange={(e) => onCambiar("indicador", e.target.value)}
            placeholder="Cómo se calcula el indicador: fórmula, periodicidad…"
            rows={4}
            className={`resize-y ${estiloInput}`}
          />
        </div>

        <div className={`${estiloCampo} sm:max-w-xs`}>
          <label className={estiloLabel}>Meta</label>
          <input
            value={fila.meta}
            onChange={(e) => onCambiar("meta", e.target.value)}
            placeholder="ej. 47, o N/A"
            className={estiloInput}
          />
        </div>

        <div className={estiloCampo}>
          <label className={estiloLabel}>Link del repositorio (opcional)</label>
          <input
            value={fila.linkRepositorio}
            onChange={(e) => onCambiar("linkRepositorio", e.target.value)}
            placeholder="Carpeta donde se guardarán las evidencias"
            className={estiloInput}
          />
        </div>
      </div>
    </article>
  );
}

function TarjetaDesarrollo({
  fila,
  numero,
  onCambiar,
}: {
  fila: FilaDesarrollo;
  numero: number;
  onCambiar: (campo: keyof FilaDesarrollo, valor: string) => void;
}) {
  return (
    <article className="overflow-hidden rounded-card border border-iib-border bg-iib-surface shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-iib-border bg-blue-600/[0.06] px-4 py-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-700 text-xs font-bold text-white">
          {numero}
        </span>
        <span className="shrink-0 rounded-full bg-blue-700 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-white">
          Desarrollo
        </span>
        <input
          value={fila.competencia}
          onChange={(e) => onCambiar("competencia", e.target.value)}
          placeholder="Competencia a desarrollar (ej. Liderazgo, Comunicación asertiva)"
          className="min-w-[14rem] flex-1 rounded-md border border-iib-border bg-iib-surface px-2.5 py-1.5 text-sm font-medium"
        />
      </div>

      <div className="flex flex-col gap-3.5 p-4">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className={estiloCampo}>
            <label className={estiloLabel}>Descripción del objetivo</label>
            <textarea
              value={fila.descripcion}
              onChange={(e) => onCambiar("descripcion", e.target.value)}
              placeholder="¿Qué se busca lograr con este objetivo?"
              rows={3}
              className={`resize-y ${estiloInput}`}
            />
          </div>
          <div className={estiloCampo}>
            <label className={estiloLabel}>Acciones</label>
            <textarea
              value={fila.acciones}
              onChange={(e) => onCambiar("acciones", e.target.value)}
              placeholder="¿Cómo se va a lograr? Pasos o actividades concretas"
              rows={3}
              className={`resize-y ${estiloInput}`}
            />
          </div>
        </div>

        <div className={estiloCampo}>
          <label className={estiloLabel}>Indicadores</label>
          <textarea
            value={fila.indicador}
            onChange={(e) => onCambiar("indicador", e.target.value)}
            placeholder="Cómo se mide el cumplimiento: fórmula, meta numérica, periodicidad…"
            rows={4}
            className={`resize-y ${estiloInput}`}
          />
        </div>

        <div className={estiloCampo}>
          <label className={estiloLabel}>Link del repositorio (opcional)</label>
          <input
            value={fila.linkRepositorio}
            onChange={(e) => onCambiar("linkRepositorio", e.target.value)}
            placeholder="Carpeta donde se guardarán las evidencias"
            className={estiloInput}
          />
        </div>
      </div>
    </article>
  );
}

export function ProponerObjetivosForm({
  objetivosPrevios,
}: {
  // Pasar los objetivos devueltos por el jefe precarga el formulario con sus
  // valores en vez de arrancar en blanco.
  objetivosPrevios?: ObjetivoVista[];
}) {
  const [desempeno, setDesempeno] = useState<FilaDesempeno[]>(() =>
    objetivosPrevios
      ? desempenoDesdeAnterior(objetivosPrevios)
      : Array.from({ length: CANTIDAD_OBJETIVOS_DESEMPENO }, filaDesempenoVacia),
  );
  const [desarrollo, setDesarrollo] = useState<FilaDesarrollo[]>(() =>
    objetivosPrevios
      ? desarrolloDesdeAnterior(objetivosPrevios)
      : Array.from({ length: CANTIDAD_DESARROLLO_ACTIVA }, filaDesarrolloVacia),
  );
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [pending, startTransition] = useTransition();

  function actualizarDesempeno(indice: number, campo: keyof FilaDesempeno, valor: string) {
    setDesempeno((prev) =>
      prev.map((f, i) =>
        i === indice ? { ...f, [campo]: campo === "peso" ? Number(valor) : valor } : f,
      ),
    );
  }

  const sumaPesos = desempeno.reduce((acc, f) => acc + Math.round((f.peso || 0) * 100), 0) / 100;
  const sumaValida = Math.round(sumaPesos * 100) === Math.round(PESO_TOTAL_INDIVIDUALES * 100);

  function repartirEquitativo() {
    const pesos = distribuirPesoEquitativo(CANTIDAD_OBJETIVOS_DESEMPENO, PESO_TOTAL_INDIVIDUALES);
    setDesempeno((prev) => prev.map((f, i) => ({ ...f, peso: pesos[i] ?? 0 })));
  }

  function actualizarDesarrollo(indice: number, campo: keyof FilaDesarrollo, valor: string) {
    setDesarrollo((prev) => prev.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f)));
  }

  function enviar() {
    setError(null);
    startTransition(async () => {
      const objetivos = [
        ...desempeno.map((f) => ({
          descripcion: f.descripcion,
          acciones: f.acciones,
          indicador: f.indicador,
          meta: f.meta,
          peso: f.peso,
          tipoIndividual: "DESEMPENO" as const,
          lineaEstrategica: f.lineaEstrategica,
          linkRepositorio: f.linkRepositorio || undefined,
        })),
        ...desarrollo.map((f) => ({
          descripcion: f.descripcion,
          acciones: f.acciones,
          indicador: f.indicador,
          tipoIndividual: "DESARROLLO" as const,
          competencia: f.competencia,
          linkRepositorio: f.linkRepositorio || undefined,
        })),
      ];

      const resultado = await accionProponerObjetivos(objetivos);
      if (!resultado.ok) {
        setError(resultado.error);
      } else {
        setEnviado(true);
      }
    });
  }

  if (enviado) {
    return (
      <div className="rounded-card bg-success-bg p-5 text-sm font-medium text-success shadow-card">
        Tus objetivos quedaron enviados a tu jefe para aprobación.
      </div>
    );
  }

  const puedeEnviar = desempeno.every(
    (f) => f.lineaEstrategica && f.descripcion.trim() && f.acciones.trim() && f.indicador.trim() && f.meta.trim(),
  ) && sumaValida;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <div className="rounded-card border border-iib-border bg-iib-surface px-4 py-3.5 shadow-card">
          <h3 className="text-sm font-bold text-iib-primary">Componente 1 (C1): Metas individuales</h3>
          <p className="text-xs text-iib-secondary">
            {CANTIDAD_OBJETIVOS_DESEMPENO} objetivos, cada uno con su línea estratégica, su meta y su peso. Los cuatro pesos
            deben sumar {PESO_TOTAL_INDIVIDUALES} %; al final del periodo tu jefe marca si cada uno cumple o no cumple.
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-sm font-bold tabular-nums ${
                sumaValida ? "bg-success-bg text-success" : "bg-danger-bg text-danger"
              }`}
            >
              {sumaPesos.toFixed(2)}% / {PESO_TOTAL_INDIVIDUALES}%
            </span>
            <button
              type="button"
              onClick={repartirEquitativo}
              className="rounded-md border border-iib-border px-3 py-1.5 text-xs font-semibold transition hover:bg-iib-surface-sunken"
            >
              Repartir equitativo
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {desempeno.map((fila, indice) => (
            <TarjetaDesempeno
              key={indice}
              fila={fila}
              numero={indice + 1}
              onCambiar={(campo, valor) => actualizarDesempeno(indice, campo, valor)}
            />
          ))}
        </div>
      </section>

      {CANTIDAD_DESARROLLO_ACTIVA > 0 && (
        <section className="flex flex-col gap-4">
          <div className="rounded-card border border-iib-border bg-iib-surface px-4 py-3.5 shadow-card">
            <h3 className="text-sm font-bold text-blue-700">Objetivos de desarrollo</h3>
            <p className="text-xs text-iib-secondary">
              {CANTIDAD_DESARROLLO_ACTIVA} objetivos, cada uno asociado a una competencia a fortalecer. No llevan peso — al
              cierre del periodo tu jefe registra si se cumplieron o no.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {desarrollo.map((fila, indice) => (
              <TarjetaDesarrollo
                key={indice}
                fila={fila}
                numero={indice + 1}
                onCambiar={(campo, valor) => actualizarDesarrollo(indice, campo, valor)}
              />
            ))}
          </div>
        </section>
      )}

      {error && <p className="text-sm font-medium text-danger">{error}</p>}

      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
        {!puedeEnviar && (
          <p className="text-sm text-warning">
            Completa la línea estratégica, la descripción, las acciones, la fórmula y la meta de los {CANTIDAD_OBJETIVOS_DESEMPENO}{" "}
            objetivos, y que los pesos sumen {PESO_TOTAL_INDIVIDUALES} %, para poder enviar.
          </p>
        )}
        <button
          type="button"
          onClick={enviar}
          disabled={pending || !puedeEnviar}
          className="rounded-md bg-iib-primary px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-iib-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Enviar a mi jefe"}
        </button>
      </div>
    </div>
  );
}
