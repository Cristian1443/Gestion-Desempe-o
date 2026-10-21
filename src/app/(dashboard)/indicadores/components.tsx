import { formatearFecha } from "@/lib/fecha";
import { etiquetaMes, nombreMesCorto } from "@/lib/mes";
import type { EstadoIndicador, IndicadorVista } from "@/server/services/indicadores.service";
import { AccionesIndicador } from "./AccionesIndicador";
import { CumplimientoControl } from "./CumplimientoControl";
import { TiraMesesEditable, type MesVista } from "./TiraMesesEditable";

const ETIQUETA_ESTADO: Record<EstadoIndicador, string> = {
  CUMPLE: "Cumple",
  NO_CUMPLE: "No cumple",
  EN_SEGUIMIENTO: "En seguimiento",
};

const CLASES_ESTADO: Record<EstadoIndicador, string> = {
  CUMPLE: "bg-success text-white",
  NO_CUMPLE: "bg-danger text-white",
  EN_SEGUIMIENTO: "bg-iib-surface-sunken text-iib-secondary",
};

const CLASE_BARRA: Record<EstadoIndicador, string> = {
  CUMPLE: "bg-success",
  NO_CUMPLE: "bg-danger",
  EN_SEGUIMIENTO: "bg-iib-primary",
};

export function TarjetaResumen({ etiqueta, valor, destacada = false }: { etiqueta: string; valor: number; destacada?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-card bg-iib-surface px-4 py-3 shadow-card">
      <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-iib-secondary">{etiqueta}</p>
      <p className={`text-2xl font-bold tabular-nums ${destacada ? "text-iib-primary" : "text-iib-foreground"}`}>{valor}</p>
    </div>
  );
}

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
  const porcentaje = indicador.ultimoPorcentaje ?? 0;

  return (
    <article className="flex flex-col gap-4 rounded-card bg-iib-surface p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 text-balance text-base font-semibold leading-snug">{indicador.titulo}</h3>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${CLASES_ESTADO[indicador.estado]}`}>
          {ETIQUETA_ESTADO[indicador.estado]}
        </span>
      </div>

      <p className="-mt-2 text-sm leading-relaxed text-iib-secondary">{indicador.descripcion}</p>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="shrink-0 text-iib-secondary">Meta</dt>
          <dd className="font-medium">
            {indicador.meta}
            {indicador.unidadMedida ? ` ${indicador.unidadMedida}` : ""}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-iib-secondary">Se mide</dt>
          <dd className="font-medium">{indicador.indicador}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-semibold">
            {indicador.ultimoPorcentaje === null ? "Sin avance registrado" : `${indicador.ultimoPorcentaje}% de avance`}
          </span>
          {ultimo && <span className="text-xs text-iib-secondary">al cierre de {etiquetaMes(ultimo.mes)}</span>}
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={porcentaje}
          aria-label={`Avance de ${indicador.titulo}`}
          className="h-2.5 overflow-hidden rounded-full bg-iib-surface-sunken"
        >
          <div className={`h-full rounded-full ${CLASE_BARRA[indicador.estado]}`} style={{ width: `${porcentaje}%` }} />
        </div>
      </div>

      <TiraMeses
        indicador={indicador}
        meses={meses}
        mesActual={mesActual}
        mesesRegistrables={mesesRegistrables}
        puedeEditar={puedeEditar}
      />

      {puedeEditar && cumplimientoEnCurso && (
        <CumplimientoControl objetivoId={indicador.id} cumplido={indicador.cumplido} />
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
            titulo: indicador.titulo,
            descripcion: indicador.descripcion,
            meta: indicador.meta,
            unidadMedida: indicador.unidadMedida ?? "",
            indicador: indicador.indicador,
          }}
          puedeEliminar={indicador.avances.length === 0 && indicador.cumplido === null}
        />
      )}
    </article>
  );
}
