"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface ItemNav {
  href: string;
  label: string;
  // Cuántas cosas te esperan en esa sección; sin número cuando todo está al día.
  conteo?: number;
}

export function NavTabs({ items }: { items: ItemNav[] }) {
  const pathname = usePathname();

  if (items.length <= 1) return null;

  return (
    <nav aria-label="Secciones" className="border-b border-iib-border bg-iib-surface">
      <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 sm:px-5">
        {items.map((item) => {
          const activo = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={activo ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-medium transition ${
                  activo
                    ? "border-iib-primary text-iib-primary"
                    : "border-transparent text-iib-secondary hover:text-iib-foreground"
                }`}
              >
                {item.label}
                {item.conteo ? (
                  <span
                    className="grid h-5 min-w-5 place-items-center rounded-full bg-iib-primary px-1.5 text-[0.7rem] font-bold leading-none text-white"
                    aria-label={`${item.conteo} pendiente${item.conteo === 1 ? "" : "s"}`}
                  >
                    {item.conteo}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
