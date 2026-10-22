import type { ReactNode } from "react";

// Sección de una página: título, un contador o aclaración a la derecha y el
// contenido. Antes cada página repetía este bloque a mano.
export function Seccion({
  titulo,
  contador,
  descripcion,
  acciones,
  children,
}: {
  titulo: string;
  contador?: ReactNode;
  descripcion?: ReactNode;
  acciones?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-iib-border pb-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-iib-foreground">{titulo}</h2>
          {descripcion && <p className="mt-0.5 text-sm text-iib-secondary">{descripcion}</p>}
        </div>
        <div className="flex items-center gap-3">
          {contador && <span className="text-sm text-iib-secondary">{contador}</span>}
          {acciones}
        </div>
      </div>
      {children}
    </section>
  );
}
