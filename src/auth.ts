import NextAuth, { type Profile, type Session, type User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { authConfig } from "@/server/auth/auth.config";
import { db } from "@/server/db";
import { resolverUsuarioParaLogin } from "@/server/services/usuarios.service";

// Provider de solo-desarrollo: permite entrar como cualquier Usuario
// existente sin pasar por Microsoft, para poder probar la app localmente sin
// depender de un App Registration de Entra ID. Nunca se registra en
// producción (ver el guard de `providers` más abajo), así que en producción
// el único camino de entrada sigue siendo el SSO corporativo.
//
// Nunca escribe en `entraObjectId` — esa columna es la que vincula de verdad
// una cuenta con el SSO corporativo real, y escribirle aquí un valor
// simulado ya rompió dos veces el primer login real de un colaborador (la
// cuenta quedaba "vinculada" a un id falso, y cuando esa persona entraba de
// verdad por Microsoft, el sistema veía el correo ya tomado por otro id y la
// rechazaba). La sesión de desarrollo se resuelve por `Usuario.id` completo
// aparte (ver `usuarioIdDev` en el JWT), sin tocar esa columna para nada.
const proveedorDesarrolloLocal = Credentials({
  id: "dev-login",
  name: "Desarrollo local",
  credentials: {
    usuarioId: { label: "ID interno de usuario de prueba", type: "text" },
  },
  async authorize(credentials) {
    const usuarioId = credentials?.usuarioId;
    if (typeof usuarioId !== "string" || !usuarioId) return null;

    const usuario = await db.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario || !usuario.activo) return null;

    return { id: usuario.id, name: usuario.nombre, email: usuario.email };
  },
});

// Configuración completa de Auth.js: providers + `authorized` (heredados de
// authConfig) más los callbacks que consultan la base de datos. Se usa desde
// Route Handlers y Server Components, que corren en runtime Node.js — nunca
// desde el Middleware (ver auth.config.ts).
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    MicrosoftEntraID,
    ...(process.env.NODE_ENV !== "production" ? [proveedorDesarrolloLocal] : []),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,

    // Solo entra quien ya es colaborador activo dado de alta en el sistema
    // — ya sea porque ya había iniciado sesión antes, o porque Talento
    // Humano lo pre-registró en la estructura organizacional y este es su
    // primer login (se vincula por correo, ver `resolverUsuarioParaLogin`).
    // El App Registration de Entra ID además está configurado como
    // single-tenant, así que ni siquiera se llega hasta aquí con una cuenta
    // fuera de la organización.
    //
    // Esta función corre para CUALQUIER provider, incluido `dev-login` — sin
    // este `return true` temprano, `resolverUsuarioParaLogin` recibía el
    // `Usuario.id` real como si fuera un entraObjectId, no encontraba nada
    // con ese valor, caía al respaldo por correo (que sí encontraba, porque
    // es el mismo usuario) y terminaba "vinculando" la cuenta real con su
    // propio id interno — la misma clase de bug que ya rompió el login real
    // dos veces antes, solo que esta vez sin el prefijo "dev-linked-".
    // `authorize()` en el provider de desarrollo ya validó que el usuario
    // existe y está activo, así que aquí no hay nada más que verificar.
    async signIn({
      profile,
      user,
      account,
    }: {
      profile?: Profile;
      user?: User;
      account?: { provider?: string } | null;
    }) {
      if (account?.provider === "dev-login") {
        return true;
      }

      const entraObjectId =
        typeof profile?.oid === "string"
          ? profile.oid
          : typeof user?.id === "string"
            ? user.id
            : undefined;
      if (!entraObjectId) return false;

      // El claim `email` del ID token de Entra ID no es confiable: solo
      // viene si la cuenta tiene el atributo `mail` poblado (muchas cuentas
      // corporativas no lo tienen y solo tienen `userPrincipalName`). Por
      // eso `preferred_username` — que en cuentas de Entra ID casi siempre
      // es el UPN, ej. "creyes@investinbogota.org" — es el respaldo real, no
      // un caso raro. Confirmado con el mismo patrón usado en la migración
      // real (`graph.mail || graph.userPrincipalName`).
      const preferredUsername =
        typeof profile?.preferred_username === "string" ? profile.preferred_username : undefined;
      const email = profile?.email ?? preferredUsername ?? user?.email ?? undefined;
      const nombre = profile?.name ?? user?.name ?? undefined;
      const usuario = await resolverUsuarioParaLogin(entraObjectId, email ?? undefined, nombre ?? undefined);
      if (!usuario || !usuario.activo) {
        // Diagnóstico para el caso en que el rechazo no sea por falta de
        // registro sino por algo más (correo ausente, correo que no
        // coincide con ninguno en la base, etc.) — se ve en la consola del
        // servidor, no en pantalla.
        console.error("[auth] Acceso denegado en signIn:", {
          entraObjectId,
          emailResuelto: email ?? "(ninguno)",
          nombre: nombre ?? "(ninguno)",
          usuarioEncontrado: !!usuario,
          usuarioActivo: usuario?.activo ?? null,
        });
        return "/acceso-denegado";
      }
      return true;
    },

    // El JWT solo guarda un identificador estable. Todo lo demás (roles,
    // gerencia, si sigue activo) se resuelve en el callback `session`,
    // consultando la base de datos en cada lectura de sesión, así un
    // colaborador desactivado después de emitido su token pierde el acceso
    // en la siguiente petición en vez de conservarlo hasta que expire el
    // JWT.
    //
    // `account` solo viene en el login inicial (no en refrescos del token),
    // así que es la única forma confiable de distinguir por qué provider se
    // autenticó esta sesión. El provider de desarrollo usa `usuarioIdDev`
    // (el `Usuario.id` real) en vez de `entraObjectId`, para no depender de
    // ni tocar esa columna.
    async jwt({
      token,
      profile,
      user,
      account,
    }: {
      token: JWT;
      profile?: Profile;
      user?: User;
      account?: { provider?: string } | null;
    }) {
      if (account?.provider === "dev-login") {
        if (typeof user?.id === "string") {
          token.usuarioIdDev = user.id;
        }
      } else if (profile && typeof profile.oid === "string") {
        token.entraObjectId = profile.oid;
      } else if (typeof user?.id === "string") {
        token.entraObjectId = user.id;
      }
      return token;
    },

    async session({ session, token }: { session: Session; token: JWT }) {
      const usuario = token.usuarioIdDev
        ? await db.usuario.findUnique({ where: { id: token.usuarioIdDev }, include: { roles: true } })
        : token.entraObjectId
          ? await db.usuario.findUnique({ where: { entraObjectId: token.entraObjectId }, include: { roles: true } })
          : null;

      if (!token.usuarioIdDev && !token.entraObjectId) {
        return session;
      }

      if (!usuario || !usuario.activo) {
        session.user = {
          ...session.user,
          usuarioId: "",
          entraObjectId: token.entraObjectId ?? null,
          nombre: session.user?.name ?? "",
          activo: false,
          roles: [],
          gerenciaId: null,
          jefeId: null,
        };
        return session;
      }

      session.user = {
        ...session.user,
        usuarioId: usuario.id,
        entraObjectId: usuario.entraObjectId,
        nombre: usuario.nombre,
        activo: usuario.activo,
        roles: usuario.roles.map((r) => r.rol),
        gerenciaId: usuario.gerenciaId,
        jefeId: usuario.jefeId,
      };
      return session;
    },
  },
});
