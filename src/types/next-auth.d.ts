import type { Rol } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      usuarioId: string;
      // Nulo en sesiones del provider de solo-desarrollo (`dev-login`), que
      // nunca toca esta columna real de Entra ID — ver `usuarioIdDev` en JWT.
      entraObjectId: string | null;
      nombre: string;
      activo: boolean;
      roles: Rol[];
      gerenciaId: string | null;
      jefeId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    entraObjectId?: string;
    // Solo presente en sesiones del provider `dev-login`: el `Usuario.id`
    // real, para resolver la sesión sin necesitar (ni poder contaminar) su
    // `entraObjectId`, que es la columna que realmente vincula la cuenta con
    // el SSO corporativo real.
    usuarioIdDev?: string;
  }
}
