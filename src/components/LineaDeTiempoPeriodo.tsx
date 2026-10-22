import { formatearFecha, formatearFechaCorta } from "@/lib/fecha";
import { diasHasta, hoyEnBogota, textoDias, type EstadoFranja } from "@/lib/franja";
import { DIAS_URGENTE } from "@/lib/pendientes";
import type { ContextoFranjas } from "@/server/services/periodos.service";

interface Etapa {
  clave: string;
  titulo: string;
  rango: string;
  estado: EstadoFranja;
  fin: Date;
}

function etapasDe(franjas: ContextoFranjas): { etapas: Etapa[]; cumplimientoSinDefinir: boolean } {
  const etapas: Etapa[] = franjas.todos.map((s) => ({
    clave: `seguimiento-${s.numero}`,
    titulo: `Seguimiento ${s.numero}`,
    rango: `${formatearFechaCorta(s.fechaInicio)} – ${formatearFechaCorta(s.fechaFin)}`,
    estado: s.estado,
    fin: s.fechaFin,
  }));

  if (franjas.cumplimiento) {
    etapas.push({
      clave: "cumplimiento",
      titulo: "% de cumplimiento",
      rango: `${formatearFechaCorta(franjas.cumplimiento.inicio)} – ${formatearFechaCorta(franjas.cumplimiento.fin)}`,
      estado: franjas.cumplimiento.estado,
      fin: franjas.cumplimiento.fin,
    });
  }
  return { etapas, cumplimientoSinDefinir: !franjas.cumplimiento };
}

function Marcador({ estado }: { estado: EstadoFranja }) {
  if (estado === "FINALIZADA") {
    return (
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-success text-white" aria-hidden>
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8.5l3 3 7-7" />
        </svg>
      </span>
    );
  }
  if (estado === "EN_CURSO") {
    return (
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-iib-primary ring-4 ring-iib-primary/20" aria-hidden>
        <span className="h-2 w-2 rounded-full bg-white" />
      </span>
    );
  }
  return <span className="h-7 w-7 shrink-0 rounded-full border-2 border-iib-border bg-iib-surface" aria-hidden />;
}

function TextoEstado({ etapa }: { etapa: Etapa }) {
  if (etapa.estado === "FINALIZADA") return <span className="text-iib-secondary">Terminado</span>;
  if (etapa.estado === "PROXIMA") return <span className="text-iib-secondary">Próximo</span>;
  const dias = diasHasta(etapa.fin);
  return (
    <span className={dias <= DIAS_URGENTE ? "font-semibold text-warning" : "font-semibold text-iib-primary"}>
      En curso · {textoDias(dias)}
    </span>
  );
}

// El recorrido del periodo: cada seguimiento y la franja del % de cumplimiento,
// con "hoy" a la vista. Reemplaza la píldora gris de fechas de antes.
export function LineaDeTiempoPeriodo({ franjas, periodo }: { franjas: ContextoFranjas; periodo: string }) {
  const { etapas, cumplimientoSinDefinir } = etapasDe(franjas);
  const hoy = new Date(`${hoyEnBogota()}T00:00:00.000Z`);

  return (
    <section aria-label={`Recorrido del periodo ${periodo}`} className="rounded-card bg-iib-surface p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-bold text-iib-foreground">
          Periodo {periodo} <span className="font-normal text-iib-secondary">· recorrido</span>
        </h2>
        <p className="text-xs text-iib-secondary">Hoy es {formatearFecha(hoy)}</p>
      </div>

      {etapas.length === 0 ? (
        <p className="text-sm text-iib-secondary">Gestión Humana todavía no definió los seguimientos de este periodo.</p>
      ) : (
        <ol className="grid gap-4 sm:grid-flow-col sm:auto-cols-fr sm:gap-0">
          {etapas.map((etapa, i) => (
            <li key={etapa.clave} className="flex gap-3 sm:flex-col sm:gap-2.5">
              <div className="flex items-center sm:w-full">
                <Marcador estado={etapa.estado} />
                {i < etapas.length - 1 && (
                  <span
                    className={`ml-0 hidden h-0.5 flex-1 sm:block ${
                      etapa.estado === "FINALIZADA" ? "bg-success" : "bg-iib-border"
                    }`}
                    aria-hidden
                  />
                )}
              </div>
              <div className="min-w-0 pr-2">
                <p className="text-sm font-semibold text-iib-foreground">{etapa.titulo}</p>
                <p className="text-xs tabular-nums text-iib-secondary">{etapa.rango}</p>
                <p className="mt-0.5 text-xs">
                  <TextoEstado etapa={etapa} />
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {cumplimientoSinDefinir && etapas.length > 0 && (
        <p className="mt-4 rounded-md bg-warning-bg px-3 py-2 text-xs font-medium text-warning">
          Falta la franja del % de cumplimiento: Gestión Humana todavía no la definió.
        </p>
      )}
    </section>
  );
}
