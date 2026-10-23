import { ETIQUETA_TIPO_INDICADOR, textoLinea, type TipoIndicadorCodigo } from "@/lib/indicadores-config";

// Piezas visuales compartidas por los indicadores de la empresa (/indicadores) y
// los de la gerencia (/mi-gerencia): hacen lo mismo y se ven igual; solo cambia
// cómo se dibuja su seguimiento (12 meses vs. seguimientos con franja).

export type EstadoIndicadorUI = "CUMPLE" | "NO_CUMPLE" | "EN_SEGUIMIENTO";

const ETIQUETA_ESTADO: Record<EstadoIndicadorUI, string> = {
  CUMPLE: "Cumple",
  NO_CUMPLE: "No cumple",
  EN_SEGUIMIENTO: "En seguimiento",
};

const CLASES_ESTADO: Record<EstadoIndicadorUI, string> = {
  CUMPLE: "bg-success text-white",
  NO_CUMPLE: "bg-danger text-white",
  EN_SEGUIMIENTO: "bg-iib-surface-sunken text-iib-secondary",
};

const CLASE_BARRA: Record<EstadoIndicadorUI, string> = {
  CUMPLE: "bg-success",
  NO_CUMPLE: "bg-danger",
  EN_SEGUIMIENTO: "bg-iib-primary",
};

export function TarjetaResumen({ etiqueta, valor, destacada = false }: { etiqueta: string; valor: number | string; destacada?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-card bg-iib-surface px-4 py-3 shadow-card">
      <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-iib-secondary">{etiqueta}</p>
      <p className={`text-2xl font-bold tabular-nums ${destacada ? "text-iib-primary" : "text-iib-foreground"}`}>{valor}</p>
    </div>
  );
}

// Indicador + estado, línea estratégica, objetivo estratégico, tipo y meta.
export function CabeceraIndicador({
  titulo,
  descripcion,
  meta,
  unidadMedida,
  lineaEstrategica,
  tipoIndicador,
  estado,
}: {
  titulo: string;
  // Objetivo estratégico.
  descripcion: string;
  meta: string;
  unidadMedida: string | null;
  lineaEstrategica: string | null;
  tipoIndicador: TipoIndicadorCodigo | null;
  estado: EstadoIndicadorUI;
}) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 text-balance text-base font-semibold leading-snug">{titulo}</h3>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${CLASES_ESTADO[estado]}`}>
          {ETIQUETA_ESTADO[estado]}
        </span>
      </div>

      {(lineaEstrategica || tipoIndicador) && (
        <div className="-mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {lineaEstrategica && <span className="font-semibold text-iib-primary">{textoLinea(lineaEstrategica)}</span>}
          {tipoIndicador && (
            <span className="rounded-full bg-iib-surface-sunken px-2.5 py-0.5 font-semibold text-iib-secondary">
              {ETIQUETA_TIPO_INDICADOR[tipoIndicador]}
            </span>
          )}
        </div>
      )}

      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm">
        <div className="flex gap-2">
          <dt className="shrink-0 text-iib-secondary">Objetivo estratégico</dt>
          <dd className="font-medium">{descripcion}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-iib-secondary">Meta</dt>
          <dd className="font-medium">
            {meta}
            {unidadMedida ? ` ${unidadMedida}` : ""}
          </dd>
        </div>
      </dl>
    </>
  );
}

// Barra con el último % de avance acumulado. `pie` dice a qué corte corresponde
// ("al cierre de octubre 2026", "en el seguimiento 2").
export function BarraAvance({
  titulo,
  porcentaje,
  estado,
  pie,
}: {
  titulo: string;
  porcentaje: number | null;
  estado: EstadoIndicadorUI;
  pie: string | null;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold">
          {porcentaje === null ? "Sin avance registrado" : `${porcentaje}% de avance`}
        </span>
        {pie && <span className="text-xs text-iib-secondary">{pie}</span>}
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={porcentaje ?? 0}
        aria-label={`Avance de ${titulo}`}
        className="h-2.5 overflow-hidden rounded-full bg-iib-surface-sunken"
      >
        <div className={`h-full rounded-full ${CLASE_BARRA[estado]}`} style={{ width: `${porcentaje ?? 0}%` }} />
      </div>
    </div>
  );
}
