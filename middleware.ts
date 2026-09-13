import NextAuth from "next-auth";
import { authConfig } from "@/server/auth/auth.config";

// Middleware "edge-safe": solo verifica que exista una sesión válida
// (callback `authorized` de authConfig). No consulta la base de datos — ver
// la explicación en src/server/auth/auth.config.ts y src/auth.ts.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Todo queda protegido excepto las rutas propias de Auth.js, los assets
  // estáticos de Next y el favicon.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
