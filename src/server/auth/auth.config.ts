import type { NextAuthConfig } from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

const RUTAS_PUBLICAS = ["/login", "/acceso-denegado"];

// Configuración "edge-safe": nada aquí toca Prisma/la base de datos, porque
// esta es la config que usa el Middleware, y el Middleware de Next.js corre
// en el runtime Edge (no soporta el motor nativo de Prisma). Por eso el
// callback `authorized` solo verifica que exista un token de sesión válido
// — es un filtro rápido de "¿está logueado?", no de "¿es un colaborador
// activo?" ni de roles.
//
// La verificación real de `activo` y de roles (que sí necesita consultar la
// base de datos) vive en `src/auth.ts` (config completa) y se aplica en
// Server Components / Route Handlers a través de
// `src/server/auth/rbac.ts`, que corren en runtime Node.js.
export const authConfig = {
  providers: [MicrosoftEntraID],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const esRutaPublica = RUTAS_PUBLICAS.some((ruta) =>
        request.nextUrl.pathname.startsWith(ruta),
      );
      if (esRutaPublica) return true;
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
