import type { ReactNode } from "react";
import { BotonLink } from "./Boton";

export type TonoCallout = "info" | "aviso" | "urgente" | "exito";

const TONOS: Record<TonoCallout, { caja: string; titulo: string }> = {
  info: { caja: "border-info bg-info-bg", titulo: "text-info" },
  aviso: { caja: "border-warning bg-warning-bg", titulo: "text-warning" },
  urgente: { caja: "border-danger bg-danger-bg", titulo: "text-danger" },
  exito: { caja: "border-success bg-success-bg", titulo: "text-success" },
};

// Un mensaje de contexto con, si aplica, la acción que sigue. Reemplaza los
// avisos sueltos que cada pantalla armaba a mano.
export function Callout({
  tono = "info",
  titulo,
  accion,
  children,
}: {
  tono?: TonoCallout;
  titulo: string;
  accion?: { href: string; etiqueta: string };
  children?: ReactNode;
}) {
  const estilo = TONOS[tono];
  return (
    <div
      role={tono === "urgente" ? "alert" : "status"}
      className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-md border-l-4 px-4 py-3.5 ${estilo.caja}`}
    >
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${estilo.titulo}`}>{titulo}</p>
        {children && <div className="mt-0.5 text-sm text-iib-foreground/80">{children}</div>}
      </div>
      {accion && (
        <BotonLink href={accion.href} tamano="sm" variante={tono === "urgente" ? "primario" : "secundario"}>
          {accion.etiqueta}
        </BotonLink>
      )}
    </div>
  );
}
