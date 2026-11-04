import { formatearFecha } from "@/lib/fecha";

// Las acciones realizadas que el colaborador registró antes de cada seguimiento (solo
// lectura): la ven el colaborador, su jefe, el gerente y la dirección.
export function EvidenciasLista({
  evidencias,
  vacio,
}: {
  evidencias: Array<{ numero: number; texto: string; fecha: Date }>;
  // Texto cuando todavía no hay ninguna; si no se pasa, no se dibuja nada.
  vacio?: string;
}) {
  if (evidencias.length === 0) {
    return vacio ? <p className="text-xs text-iib-secondary">{vacio}</p> : null;
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-xs font-bold uppercase tracking-wide text-iib-secondary">Acciones realizadas</p>
      <ul className="flex flex-col gap-2.5">
        {evidencias.map((e) => (
          <li key={e.numero} className="rounded-md border border-iib-border bg-iib-surface px-3 py-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="text-xs font-bold text-iib-foreground">Antes del seguimiento {e.numero}</span>
              <span className="text-xs text-iib-secondary">{formatearFecha(e.fecha)}</span>
            </div>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{e.texto}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
