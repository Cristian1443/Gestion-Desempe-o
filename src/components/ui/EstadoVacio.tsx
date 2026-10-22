import type { ReactNode } from "react";
import { BotonLink } from "./Boton";

// Cuando no hay nada que mostrar: dice qué pasa y, siempre que se pueda, qué
// hacer. Nunca un "no hay datos" a secas.
export function EstadoVacio({
  titulo,
  accion,
  children,
}: {
  titulo: string;
  accion?: { href: string; etiqueta: string };
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-iib-border bg-iib-surface px-6 py-10 text-center">
      <p className="text-base font-semibold text-iib-foreground">{titulo}</p>
      {children && <div className="max-w-md text-sm leading-relaxed text-iib-secondary">{children}</div>}
      {accion && (
        <BotonLink href={accion.href} variante="secundario" tamano="sm">
          {accion.etiqueta}
        </BotonLink>
      )}
    </div>
  );
}
