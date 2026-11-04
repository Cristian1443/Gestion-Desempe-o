import { formatearFecha } from "@/lib/fecha";
import type { EstadoFranja } from "@/lib/franja";
import type { ItemCronograma } from "@/server/services/cronograma.service";

const ESTADO: Record<EstadoFranja, { texto: string; clases: string; punto: string }> = {
  EN_CURSO: { texto: "En curso", clases: "bg-success-bg text-success", punto: "bg-success" },
  PROXIMA: { texto: "Próxima", clases: "bg-iib-surface-sunken text-iib-secondary", punto: "bg-iib-border" },
  FINALIZADA: { texto: "Finalizada", clases: "bg-iib-surface-sunken text-iib-secondary", punto: "bg-iib-secondary/50" },
};

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// "5 nov" / "30 ene": día y mes, para que la tabla quede compacta. Las fechas son de
// calendario guardadas como medianoche UTC, por eso se leen en UTC.
function diaMes(fecha: Date): string {
  return `${fecha.getUTCDate()} ${MESES[fecha.getUTCMonth()]}`;
}

// El año solo se agrega cuando es distinto al del primer elemento del cronograma (por
// ejemplo, la carga de evidencia y la evaluación de enero del año siguiente).
function rango(inicio: Date, fin: Date, anioBase: number): string {
  const texto = inicio.getTime() === fin.getTime() ? diaMes(inicio) : `${diaMes(inicio)} – ${diaMes(fin)}`;
  return fin.getUTCFullYear() === anioBase ? texto : `${texto} ${fin.getUTCFullYear()}`;
}

// Calendario del periodo, igual para todos: qué se hace y cuándo. Lo que está en curso
// hoy se resalta, para que cada persona sepa en qué momento estamos.
export function CronogramaPeriodo({ periodoNombre, items }: { periodoNombre: string; items: ItemCronograma[] }) {
  if (items.length === 0) return null;
  const anioBase = items[0]!.inicio.getUTCFullYear();

  return (
    <section
      aria-labelledby="cronograma-titulo"
      className="overflow-hidden rounded-card border border-iib-border bg-iib-surface shadow-card"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-iib-border bg-iib-primary/[0.06] px-5 py-3">
        <h2 id="cronograma-titulo" className="text-sm font-bold text-iib-foreground">
          Cronograma del periodo {periodoNombre}
        </h2>
        <span className="text-xs text-iib-secondary">Fechas inclusivas</span>
      </div>

      <ol className="divide-y divide-iib-border">
        {items.map((item) => {
          const estado = ESTADO[item.estado];
          const enCurso = item.estado === "EN_CURSO";
          return (
            <li
              key={item.clave}
              className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5 ${
                enCurso ? "bg-success-bg/40" : ""
              }`}
              title={`${formatearFecha(item.inicio)} al ${formatearFecha(item.fin)}`}
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${estado.punto}`} aria-hidden />
              <span className="w-44 shrink-0 whitespace-nowrap text-sm font-bold tabular-nums text-iib-foreground">
                {rango(item.inicio, item.fin, anioBase)}
              </span>
              <span className={`min-w-0 flex-1 text-sm ${enCurso ? "font-semibold" : ""} text-iib-foreground`}>
                {item.nombre}
              </span>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ${estado.clases}`}>
                {estado.texto}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
