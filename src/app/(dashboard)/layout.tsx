import Image from "next/image";
import { signOut } from "@/auth";
import { requireUsuarioAutenticado } from "@/server/auth/rbac";
import { db } from "@/server/db";
import { Avatar } from "@/components/Avatar";
import { NavTabs } from "./NavTabs";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await requireUsuarioAutenticado();
  // Solo se necesita saber si existe, no traer los bytes de la foto acá —
  // el navegador la pide aparte por /api/foto/[usuarioId] cuando el <img> se
  // renderiza.
  const { foto } = await db.usuario.findUniqueOrThrow({
    where: { id: usuario.usuarioId },
    select: { foto: true },
  });

  // Los tres componentes de medición, en su orden: C1, C2 (solo gerentes) y C3.
  const items = [{ href: "/mis-objetivos", label: "Metas individuales" }];
  if (usuario.roles.includes("GERENTE")) {
    items.push({ href: "/mi-gerencia", label: "Metas por gerencia" });
  }
  items.push({ href: "/indicadores", label: "Resultado institucional" });
  if (usuario.roles.includes("JEFE")) {
    items.push({ href: "/mi-equipo", label: "Mi equipo" });
  }
  if (usuario.roles.includes("GESTION_HUMANA") || usuario.roles.includes("ADMIN")) {
    items.push({ href: "/administracion", label: "Administración" });
    items.push({ href: "/resultados", label: "Resultados" });
  }

  return (
    <div className="min-h-screen bg-iib-background">
      <header className="flex items-center justify-between gap-4 bg-iib-primary px-4 py-3 text-white sm:px-6">
        <div className="flex items-center gap-3.5">
          <Image
            src="/logo-iib.png"
            alt="Invest in Bogotá"
            width={2346}
            height={1168}
            priority
            className="h-11 w-auto object-contain"
          />
          <div className="hidden h-8 w-px bg-white/25 sm:block" />
          <p className="hidden text-sm font-semibold sm:block">Gestión del Desempeño</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:inline">{usuario.nombre}</span>
          <Avatar
            usuarioId={usuario.usuarioId}
            nombre={usuario.nombre}
            tieneFoto={foto !== null}
            size="h-9 w-9"
            fallbackClassName="bg-white text-iib-primary"
          />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="rounded-md border border-white/50 px-3 py-1.5 text-xs font-medium transition hover:bg-white/10"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>

      <NavTabs items={items} />

      <main className="mx-auto flex max-w-7xl flex-col gap-9 px-4 pb-16 pt-7 sm:px-6">
        {children}
      </main>
    </div>
  );
}
