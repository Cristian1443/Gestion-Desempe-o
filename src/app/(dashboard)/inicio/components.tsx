import { BotonLink } from "@/components/ui/Boton";
import { Chip, type TonoChip } from "@/components/ui/Chip";
import type { Pendiente, PrioridadPendiente } from "@/lib/pendientes";

const ETIQUETA_PRIORIDAD: Record<PrioridadPendiente, { texto: string; tono: TonoChip }> = {
  URGENTE: { texto: "Urgente", tono: "peligro" },
  AHORA: { texto: "Para ahora", tono: "info" },
  PROXIMO: { texto: "Para tu información", tono: "neutro" },
};

const BORDE_PRIORIDAD: Record<PrioridadPendiente, string> = {
  URGENTE: "border-l-danger",
  AHORA: "border-l-iib-primary",
  PROXIMO: "border-l-iib-border",
};

// Una tarea concreta: qué es, por qué, hasta cuándo y un botón que lleva
// directo al lugar donde se hace.
export function TarjetaPendiente({ pendiente }: { pendiente: Pendiente }) {
  const etiqueta = ETIQUETA_PRIORIDAD[pendiente.prioridad];
  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-card border-l-4 bg-iib-surface p-5 shadow-card ${BORDE_PRIORIDAD[pendiente.prioridad]}`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div>
          <Chip tono={etiqueta.tono}>{etiqueta.texto}</Chip>
        </div>
        <h3 className="text-balance text-base font-semibold leading-snug text-iib-foreground">{pendiente.titulo}</h3>
        <p className="text-sm leading-relaxed text-iib-secondary">{pendiente.detalle}</p>
        {pendiente.limite && <p className="text-xs font-medium text-iib-foreground">{pendiente.limite}</p>}
      </div>
      <BotonLink href={pendiente.href} variante={pendiente.prioridad === "PROXIMO" ? "secundario" : "primario"}>
        {pendiente.accion}
      </BotonLink>
    </li>
  );
}

export function TarjetaResumen({
  etiqueta,
  valor,
  detalle,
}: {
  etiqueta: string;
  valor: string;
  detalle: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-card bg-iib-surface p-5 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-iib-secondary">{etiqueta}</p>
      <p className="text-3xl font-bold tabular-nums text-iib-foreground">{valor}</p>
      <p className="text-sm text-iib-secondary">{detalle}</p>
    </div>
  );
}
