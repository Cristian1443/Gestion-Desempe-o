import type { Rol } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type UsuarioSesion = {
  usuarioId: string;
  entraObjectId: string;
  nombre: string;
  activo: boolean;
  roles: Rol[];
  gerenciaId: string | null;
  jefeId: string | null;
};

export async function obtenerUsuarioSesion(): Promise<UsuarioSesion | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as UsuarioSesion;
}

export function tieneRol(roles: Rol[], rolesPermitidos: Rol[]): boolean {
  return roles.some((rol) => rolesPermitidos.includes(rol));
}

// Debe llamarse al inicio de todo layout / página / Route Handler / Server
// Action protegido. El Middleware (auth.config.ts) ya filtra a quien no
// tiene sesión, pero no puede consultar la base de datos (corre en runtime
// Edge) — por eso esta función es la que realmente confirma que el
// colaborador sigue activo, y la que hay que llamar en cada punto de entrada
// del servidor para que una desactivación tenga efecto inmediato.
export async function requireUsuarioAutenticado(): Promise<UsuarioSesion> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const usuario = session.user as UsuarioSesion;
  if (!usuario.activo || !usuario.usuarioId) {
    redirect("/acceso-denegado");
  }

  return usuario;
}

export async function requireRol(...rolesPermitidos: Rol[]): Promise<UsuarioSesion> {
  const usuario = await requireUsuarioAutenticado();
  if (!tieneRol(usuario.roles, rolesPermitidos)) {
    redirect("/acceso-denegado");
  }
  return usuario;
}
