import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type VarianteBoton = "primario" | "secundario" | "fantasma" | "peligro";
export type TamanoBoton = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

const VARIANTES: Record<VarianteBoton, string> = {
  primario: "bg-iib-primary text-white shadow-sm hover:bg-iib-primary-hover",
  secundario: "border border-iib-border bg-iib-surface text-iib-foreground hover:bg-iib-surface-sunken",
  fantasma: "text-iib-primary hover:bg-iib-primary/10",
  peligro: "border border-danger/40 bg-iib-surface text-danger hover:bg-danger-bg",
};

// `md` mide al menos 44 px de alto: es el tamaño táctil mínimo en celular.
const TAMANOS: Record<TamanoBoton, string> = {
  sm: "min-h-9 px-3 py-1.5 text-xs",
  md: "min-h-11 px-4 py-2.5 text-sm",
};

// Clases de un botón, para aplicarlas a un <Link> o a cualquier elemento.
export function claseBoton(variante: VarianteBoton = "primario", tamano: TamanoBoton = "md"): string {
  return `${BASE} ${VARIANTES[variante]} ${TAMANOS[tamano]}`;
}

export function Boton({
  variante = "primario",
  tamano = "md",
  className = "",
  type = "button",
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: VarianteBoton; tamano?: TamanoBoton }) {
  return <button type={type} className={`${claseBoton(variante, tamano)} ${className}`} {...resto} />;
}

export function BotonLink({
  href,
  variante = "primario",
  tamano = "md",
  className = "",
  children,
}: {
  href: string;
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${claseBoton(variante, tamano)} ${className}`}>
      {children}
    </Link>
  );
}
