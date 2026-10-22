import Image from "next/image";
import { signOut } from "@/auth";
import { requireUsuarioAutenticado } from "@/server/auth/rbac";
import { db } from "@/server/db";
import { obtenerPendientes } from "@/server/services/pendientes.service";
import { Avatar } from "@/components/Avatar";
import { NavTabs, type ItemNav } from "./NavTabs";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await requireUsuarioAutenticado();
  // Solo se necesita saber si existe, no traer los bytes de la foto acá —
  // el navegador la pide aparte por /api/foto/[usuarioId] cuando el <img> se
  // renderiza.
  const [{ foto, cargo }, { porAmbito }] = await Promise.all([
    db.usuario.findUniqueOrThrow({
      where: { id: usuario.usuarioId },
      select: { foto: true, cargo: true },
    }),
    obtenerPendientes(usuario),
  ]);

  const totalPendientes = Object.values(porAmbito).reduce((suma, n) => suma + (n ?? 0), 0);

  const items: ItemNav[] = [
    { href: "/inicio", label: "Inicio", conteo: totalPendientes },
    { href: "/mis-objetivos", label: "Mis objetivos", conteo: porAmbito["mis-objetivos"] },
    { href: "/indicadores", label: "Indicadores", conteo: porAmbito["indicadores"] },
  ];
  if (usuario.roles.includes("JEFE")) {
    items.push({ href: "/mi-equipo", label: "Mi equipo", conteo: porAmbito["mi-equipo"] });
  }
  if (usuario.roles.includes("GERENTE")) {
    items.push({ href: "/mi-gerencia", label: "Mi gerencia", conteo: porAmbito["mi-gerencia"] });
  }
  if (usuario.roles.includes("GESTION_HUMANA") || usuario.roles.includes("ADMIN")) {
    items.push({ href: "/administracion", label: "Administración", conteo: porAmbito["administracion"] });
    items.push({ href: "/resultados", label: "Resultados" });
  }

  return (
    <div className="min-h-screen bg-iib-background">
      <div className="sticky top-0 z-30 shadow-sm">
        <header className="flex items-center justify-between gap-4 border-b border-iib-border bg-iib-surface px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-4">
            <Image
              src="/logo-iib.png"
              alt="Invest in Bogotá"
              width={2346}
              height={1168}
              priority
              sizes="160px"
              className="-my-2 h-14 w-auto object-contain"
            />
            <span className="hidden h-7 w-px bg-iib-border sm:block" aria-hidden />
            <p className="hidden text-sm font-semibold text-iib-foreground sm:block">Gestión del Desempeño</p>
          </div>

          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition hover:bg-iib-surface-sunken [&::-webkit-details-marker]:hidden">
              <Avatar
                usuarioId={usuario.usuarioId}
                nombre={usuario.nombre}
                tieneFoto={foto !== null}
                size="h-9 w-9"
                fallbackClassName="bg-iib-primary text-white"
              />
              <span className="hidden max-w-[14rem] truncate text-sm font-medium text-iib-foreground sm:inline">
                {usuario.nombre}
              </span>
              <svg
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5 text-iib-secondary transition group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M4 6l4 4 4-4" />
              </svg>
            </summary>
            <div className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-card border border-iib-border bg-iib-surface shadow-lg">
              <div className="border-b border-iib-border px-4 py-3">
                <p className="truncate text-sm font-semibold text-iib-foreground">{usuario.nombre}</p>
                {cargo && <p className="truncate text-xs text-iib-secondary">{cargo}</p>}
              </div>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button
                  type="submit"
                  className="flex min-h-11 w-full items-center px-4 text-left text-sm font-medium text-iib-foreground transition hover:bg-iib-surface-sunken"
                >
                  Cerrar sesión
                </button>
              </form>
            </div>
          </details>
        </header>

        <NavTabs items={items} />
      </div>

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-20 pt-8 sm:px-6">{children}</main>
    </div>
  );
}
