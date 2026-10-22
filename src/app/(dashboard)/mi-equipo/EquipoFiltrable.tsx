"use client";

import { useMemo, useRef, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import type { FranjaUI } from "@/lib/franja-ui";
import type { ColaboradorEquipo } from "@/server/services/equipo.service";
import { ColaboradorPanel, FilaColaborador, resumenColaborador } from "./components";

type FiltroTipo = "TODOS" | "DESEMPENO" | "DESARROLLO";
type Vista = "ATENCION" | "TODOS";

const OPCIONES_TIPO: { valor: FiltroTipo; etiqueta: string }[] = [
  { valor: "TODOS", etiqueta: "Todos los tipos" },
  { valor: "DESEMPENO", etiqueta: "Desempeño" },
  { valor: "DESARROLLO", etiqueta: "Desarrollo" },
];

// Lista del equipo a la izquierda (con lo que cada persona necesita de ti
// escrito en palabras) y, a la derecha, el detalle de la persona elegida. Por
// defecto se muestran primero las personas que necesitan atención.
export function EquipoFiltrable({ colaboradores, franja }: { colaboradores: ColaboradorEquipo[]; franja: FranjaUI }) {
  const resumenes = useMemo(
    () => new Map(colaboradores.map((c) => [c.usuarioId, resumenColaborador(c, franja)])),
    [colaboradores, franja],
  );
  const conAtencion = colaboradores.filter((c) => resumenes.get(c.usuarioId)?.nivel === "ATENCION");

  const [busqueda, setBusqueda] = useState("");
  const [vista, setVista] = useState<Vista>(conAtencion.length > 0 ? "ATENCION" : "TODOS");
  const [tipo, setTipo] = useState<FiltroTipo>("TODOS");
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return colaboradores
      .filter((c) => c.nombre.toLowerCase().includes(termino))
      .filter((c) => vista === "TODOS" || resumenes.get(c.usuarioId)?.nivel === "ATENCION")
      .sort((a, b) => {
        // Quien necesita atención va primero; dentro de cada grupo, orden alfabético.
        const peso = (c: ColaboradorEquipo) => (resumenes.get(c.usuarioId)?.nivel === "ATENCION" ? 0 : 1);
        return peso(a) - peso(b) || a.nombre.localeCompare(b.nombre, "es");
      });
  }, [colaboradores, busqueda, vista, resumenes]);

  // Si nadie está elegido, el panel muestra a la primera persona de la lista.
  const seleccionado = visibles.find((c) => c.usuarioId === seleccionadoId) ?? visibles[0] ?? null;

  // El panel mira solo los objetivos del tipo elegido, sin cambiar el resumen de la lista.
  const seleccionadoFiltrado =
    seleccionado && tipo !== "TODOS"
      ? { ...seleccionado, objetivos: seleccionado.objetivos.filter((o) => o.tipoIndividual === tipo) }
      : seleccionado;

  function elegir(id: string) {
    setSeleccionadoId(id);
    // En pantallas angostas el detalle queda debajo de la lista: se lleva la vista hasta allí.
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
      <div className="flex flex-col gap-3">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre…"
          aria-label="Buscar colaborador por nombre"
          className="min-h-11 w-full rounded-md border border-iib-border bg-iib-surface px-3 text-sm focus:border-iib-primary focus:outline-none focus:ring-2 focus:ring-iib-primary/15"
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setVista("ATENCION")}
            aria-pressed={vista === "ATENCION"}
            className={`min-h-9 rounded-full px-3.5 text-xs font-semibold transition ${
              vista === "ATENCION"
                ? "bg-iib-primary text-white"
                : "border border-iib-border bg-iib-surface text-iib-secondary hover:bg-iib-surface-sunken"
            }`}
          >
            Necesitan atención ({conAtencion.length})
          </button>
          <button
            type="button"
            onClick={() => setVista("TODOS")}
            aria-pressed={vista === "TODOS"}
            className={`min-h-9 rounded-full px-3.5 text-xs font-semibold transition ${
              vista === "TODOS"
                ? "bg-iib-primary text-white"
                : "border border-iib-border bg-iib-surface text-iib-secondary hover:bg-iib-surface-sunken"
            }`}
          >
            Todos ({colaboradores.length})
          </button>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as FiltroTipo)}
            aria-label="Tipo de objetivo que se muestra en el detalle"
            className="ml-auto min-h-9 rounded-md border border-iib-border bg-iib-surface px-2 text-xs font-medium text-iib-secondary"
          >
            {OPCIONES_TIPO.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.etiqueta}
              </option>
            ))}
          </select>
        </div>

        {visibles.length === 0 ? (
          vista === "ATENCION" && busqueda.trim() === "" ? (
            <EstadoVacio titulo="Todo tu equipo está al día">
              Nadie necesita nada de ti ahora mismo.
              <div className="mt-3">
                <Chip tono="exito">Sin pendientes</Chip>
              </div>
            </EstadoVacio>
          ) : (
            <EstadoVacio titulo="No hay nadie con ese filtro">Cambia la búsqueda o mira a todo el equipo.</EstadoVacio>
          )
        ) : (
          <ul className="flex flex-col gap-2.5 lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto lg:pr-1">
            {visibles.map((colaborador) => (
              <li key={colaborador.usuarioId}>
                <FilaColaborador
                  colaborador={colaborador}
                  resumen={resumenes.get(colaborador.usuarioId)!}
                  seleccionado={colaborador.usuarioId === seleccionado?.usuarioId}
                  onClick={() => elegir(colaborador.usuarioId)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div ref={panelRef} className="scroll-mt-32 lg:sticky lg:top-32">
        {seleccionadoFiltrado ? (
          <ColaboradorPanel colaborador={seleccionadoFiltrado} franja={franja} />
        ) : (
          <EstadoVacio titulo="Elige a una persona">Aquí verás y gestionarás sus objetivos.</EstadoVacio>
        )}
      </div>
    </div>
  );
}
