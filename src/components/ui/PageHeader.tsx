import type { ReactNode } from "react";

// Encabezado de página: título, una línea que dice para qué sirve la pantalla y,
// a la derecha, la acción principal. Todas las pantallas lo usan.
export function PageHeader({
  titulo,
  subtitulo,
  acciones,
  children,
}: {
  titulo: string;
  subtitulo?: ReactNode;
  acciones?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-balance text-2xl font-bold tracking-tight text-iib-foreground sm:text-[1.7rem]">
            {titulo}
          </h1>
          {subtitulo && <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-iib-secondary">{subtitulo}</p>}
        </div>
        {acciones && <div className="flex shrink-0 flex-wrap items-center gap-2">{acciones}</div>}
      </div>
      {children}
    </header>
  );
}
