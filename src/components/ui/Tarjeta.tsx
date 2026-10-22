import type { ElementType, ReactNode } from "react";

// Superficie blanca con sombra suave. `relleno` evita repetir los paddings.
export function Tarjeta({
  como: Etiqueta = "div",
  relleno = "md",
  className = "",
  children,
}: {
  como?: ElementType;
  relleno?: "ninguno" | "sm" | "md" | "lg";
  className?: string;
  children: ReactNode;
}) {
  const padding = { ninguno: "", sm: "p-4", md: "p-5", lg: "p-6" }[relleno];
  return <Etiqueta className={`rounded-card bg-iib-surface shadow-card ${padding} ${className}`}>{children}</Etiqueta>;
}
