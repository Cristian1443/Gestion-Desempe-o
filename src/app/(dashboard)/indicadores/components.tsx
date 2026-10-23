import { formatearFecha } from "@/lib/fecha";
import { etiquetaMes, nombreMesCorto } from "@/lib/mes";
import { AccionesIndicador } from "@/components/AccionesIndicador";
import { CumplimientoControl } from "@/components/CumplimientoControl";
import { BarraAvance, CabeceraIndicador } from "@/components/indicador-ui";
import type { IndicadorVista } from "@/server/services/indicadores.service";
import { accionEditarIndicador, accionEliminarIndicador, accionMarcarCumplimiento } from "./actions";
import { TiraMesesEditable, type MesVista } from "./TiraMesesEditable";

// La tira de 12 meses. Quien edita toca un mes para registrar o corregir su
// avance (un solo diálogo por indicador); los demás solo lo ven. Los meses
// futuros quedan apagados.
function TiraMeses({
  indicador,
  meses,
  mesActual,
  mesesRegistrables,
  puedeEditar,
}: {
  indicador: IndicadorVista;
  meses: string[];
  mesActual: string;
  mesesRegistrables: string[];
  puedeEditar: boolean;
}) {
  const vistas: MesVista[] = meses.map((mes) => {
    const avance = indicador.avances.find((a) => a.mes === mes);
    return {
      mes,
      etiqueta: etiquetaMes(mes),
      corto: nombreMesCorto(mes),
      porcentaje: avance?.porcentaje ?? null,
      comentario: avance?.comentario ?? null,
      registrable: mesesRegistrables.includes(mes),
      esMesActual: mes === mesActual,
    };
  });

  if (puedeEditar) {
    return <TiraMesesEditable objetivoId={indicador.id} tituloIndicador={indicador.titulo} meses={vistas} />;
  }

  return (
    <ol className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-12" aria-label="Avance por mes">
      {vistas.map((m) => (
        <li
          key={m.mes}
          title={m.porcentaje !== null ? `${m.etiqueta}: ${m.porcentaje}%` : m.etiqueta}
          className={`flex flex-col items-center gap-0.5 rounded-md border px-1 py-1.5 text-center ${
            m.esMesActual ? "border-iib-primary ring-2 ring-iib-primary/20" : "border-iib-border"
          } ${m.porcentaje !== null ? "bg-iib-surface-sunken" : "bg-iib-surface"} ${m.registrable ? "" : "opacity-40"}`}
        >
          <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-iib-secondary">{m.corto}</span>
          <span className="text-sm font-bold tabular-nums">{m.porcentaje !== null ? `${m.porcentaje}%` : "—"}</span>
        </li>
      ))}
    </ol>
  );
}

export function IndicadorCard({
  indicador,
  meses,
  mesActual,
  mesesRegistrables,
  puedeEditar,
  cumplimientoEnCurso,
}: {
  indicador: IndicadorVista;
  meses: string[];
  mesActual: string;
  mesesRegistrables: string[];
  puedeEditar: boolean;
  cumplimientoEnCurso: boolean;
}) {
  const ultimo = indicador.avances[indicador.avances.length - 1];

  return (
    <article className="flex flex-col gap-4 rounded-card bg-iib-surface p-5 shadow-card">
      <CabeceraIndicador
        titulo={indicador.titulo}
        descripcion={indicador.descripcion}
        meta={indicador.meta}
        unidadMedida={indicador.unidadMedida}
        lineaEstrategica={indicador.lineaEstrategica}
        estado={indicador.estado}
      />

      <BarraAvance
        titulo={indicador.titulo}
        porcentaje={indicador.ultimoPorcentaje}
        estado={indicador.estado}
        pie={ultimo ? `al cierre de ${etiquetaMes(ultimo.mes)}` : null}
      />

      <TiraMeses
        indicador={indicador}
        meses={meses}
        mesActual={mesActual}
        mesesRegistrables={mesesRegistrables}
        puedeEditar={puedeEditar}
      />

      {puedeEditar && cumplimientoEnCurso && (
        <CumplimientoControl objetivoId={indicador.id} cumplido={indicador.cumplido} accion={accionMarcarCumplimiento} />
      )}

      {indicador.avances.length > 0 && (
        <details className="group rounded-md border border-iib-border">
          <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-iib-secondary hover:text-iib-foreground">
            Historial de seguimientos ({indicador.avances.length})
          </summary>
          <ul className="flex flex-col gap-2 border-t border-iib-border p-3">
            {[...indicador.avances].reverse().map((a) => (
              <li key={a.mes} className="rounded-md bg-iib-surface-sunken px-3 py-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="text-xs font-bold capitalize text-iib-foreground">
                    {etiquetaMes(a.mes)} · {a.porcentaje}%
                  </span>
                  <span className="text-xs text-iib-secondary">
                    {formatearFecha(a.fecha)} · {a.registradoPorNombre}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed">{a.comentario}</p>
              </li>
            ))}
          </ul>
        </details>
      )}

      {puedeEditar && (
        <AccionesIndicador
          objetivoId={indicador.id}
          datos={{
            lineaEstrategica: indicador.lineaEstrategica ?? "",
            descripcion: indicador.descripcion,
            titulo: indicador.titulo,
            meta: indicador.meta,
          }}
          puedeEliminar={indicador.avances.length === 0 && indicador.cumplido === null}
          accionEditar={accionEditarIndicador}
          accionEliminar={accionEliminarIndicador}
        />
      )}
    </article>
  );
}
