"use client";

import { useMemo, useState } from "react";
import type { FranjaUI } from "@/lib/franja-ui";
import { DESARROLLO_HABILITADO } from "@/lib/objetivos-config";
import type { ColaboradorEquipo, MiEquipo } from "@/server/services/equipo.service";
import { ColaboradorPanel, TarjetaColaborador, TarjetaJefe } from "./components";

type FiltroTipo = "TODOS" | "DESEMPENO" | "DESARROLLO";

const OPCIONES_TIPO: { valor: FiltroTipo; etiqueta: string }[] = [
  { valor: "TODOS", etiqueta: "Todos" },
  { valor: "DESEMPENO", etiqueta: "Desempeño" },
  { valor: "DESARROLLO", etiqueta: "Desarrollo" },
];

export function EquipoFiltrable({
  colaboradores,
  franja,
  jefe,
}: {
  colaboradores: ColaboradorEquipo[];
  franja: FranjaUI;
  jefe: MiEquipo["jefe"];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState<FiltroTipo>("TODOS");
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);

  const colaboradoresFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    const porNombre = colaboradores.filter((c) => c.nombre.toLowerCase().includes(termino));

    if (tipo === "TODOS") return porNombre;

    // Al filtrar por tipo, un colaborador que ya tenía objetivos pero ninguno
    // del tipo elegido desaparece de la lista; uno que aún no ha propuesto
    // nada se mantiene, porque ese mensaje sigue siendo relevante sin
    // importar el filtro.
    return porNombre
      .map((c) => ({ ...c, objetivos: c.objetivos.filter((o) => o.tipoIndividual === tipo) }))
      .filter((c, indice) => (porNombre[indice]?.objetivos.length ?? 0) === 0 || c.objetivos.length > 0);
  }, [colaboradores, busqueda, tipo]);

  const seleccionado = colaboradoresFiltrados.find((c) => c.usuarioId === seleccionadoId) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <TarjetaJefe jefe={jefe} />

      <div className="flex items-center gap-3 before:h-px before:flex-1 before:bg-iib-border after:h-px after:flex-1 after:bg-iib-border">
        <p className="shrink-0 text-xs font-semibold uppercase tracking-wide text-iib-secondary">
          Personas a cargo de {jefe.nombre}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-card border border-iib-border bg-iib-surface px-4 py-3 shadow-card">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar colaborador por nombre…"
          className="min-w-[14rem] flex-1 rounded-md border border-iib-border bg-iib-background px-3 py-2 text-sm focus:border-iib-primary focus:outline-none focus:ring-2 focus:ring-iib-primary/15"
        />
        <div className={DESARROLLO_HABILITADO ? "flex gap-1.5" : "hidden"}>
          {OPCIONES_TIPO.map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              onClick={() => setTipo(opcion.valor)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                tipo === opcion.valor
                  ? "bg-iib-primary text-white"
                  : "border border-iib-border text-iib-secondary hover:bg-iib-surface-sunken"
              }`}
            >
              {opcion.etiqueta}
            </button>
          ))}
        </div>
      </div>

      {colaboradoresFiltrados.length === 0 ? (
        <p className="rounded-card bg-iib-surface p-5 text-center text-sm text-iib-secondary shadow-card">
          No se encontraron colaboradores con ese filtro.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {colaboradoresFiltrados.map((colaborador) => (
            <TarjetaColaborador
              key={colaborador.usuarioId}
              colaborador={colaborador}
              referenciaNumero={franja.referenciaNumero}
              seleccionado={colaborador.usuarioId === seleccionadoId}
              onClick={() =>
                setSeleccionadoId((actual) => (actual === colaborador.usuarioId ? null : colaborador.usuarioId))
              }
            />
          ))}
        </div>
      )}

      {seleccionado ? (
        <ColaboradorPanel colaborador={seleccionado} franja={franja} />
      ) : (
        <p className="rounded-card border border-dashed border-iib-border p-5 text-center text-sm text-iib-secondary">
          Selecciona un colaborador para ver y gestionar sus objetivos.
        </p>
      )}
    </div>
  );
}
