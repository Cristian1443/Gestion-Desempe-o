import type { ReactNode } from "react";

export type TonoChip = "neutro" | "exito" | "aviso" | "peligro" | "info" | "marca";

const TONOS: Record<TonoChip, string> = {
  neutro: "bg-iib-surface-sunken text-iib-secondary",
  exito: "bg-success-bg text-success",
  aviso: "bg-warning-bg text-warning",
  peligro: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
  marca: "bg-iib-primary text-white",
};

// El estado nunca depende solo del color: cada tono lleva un símbolo propio.
function Simbolo({ tono }: { tono: TonoChip }) {
  const props = {
    viewBox: "0 0 16 16",
    className: "h-3 w-3 shrink-0",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (tono) {
    case "exito":
      return (
        <svg {...props}>
          <path d="M3 8.5l3 3 7-7" />
        </svg>
      );
    case "aviso":
    case "peligro":
      return (
        <svg {...props}>
          <path d="M8 3v6M8 12.5v.01" />
        </svg>
      );
    case "info":
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="5.5" />
          <path d="M8 5v3.5l2 1" />
        </svg>
      );
    default:
      return <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden />;
  }
}

export function Chip({
  tono = "neutro",
  conSimbolo = true,
  className = "",
  children,
}: {
  tono?: TonoChip;
  conSimbolo?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${TONOS[tono]} ${className}`}
    >
      {conSimbolo && <Simbolo tono={tono} />}
      {children}
    </span>
  );
}
