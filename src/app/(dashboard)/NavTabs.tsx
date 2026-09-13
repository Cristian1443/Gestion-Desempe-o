"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavTabs({ items }: { items: Array<{ href: string; label: string }> }) {
  const pathname = usePathname();

  if (items.length <= 1) return null;

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-iib-border bg-iib-surface px-4 sm:px-6">
      {items.map((item) => {
        const activo = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition ${
              activo
                ? "border-iib-primary text-iib-primary"
                : "border-transparent text-iib-secondary hover:text-iib-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
