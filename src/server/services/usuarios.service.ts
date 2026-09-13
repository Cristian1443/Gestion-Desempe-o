import { db } from "@/server/db";

// Resuelve qué `Usuario` corresponde a una cuenta que acaba de autenticarse
// por SSO. Tres caminos, en orden:
//   1. Ya existe un Usuario con este entraObjectId — es alguien que ya había
//      iniciado sesión antes. Caso normal de todos los días.
//   2. No existe por entraObjectId, pero sí hay un Usuario con el mismo
//      correo sin vincular todavía (`entraObjectId` nulo) — Gestión Humana
//      lo pre-registró de antemano en la estructura organizacional (con su
//      jefe, gerencia y roles ya definidos) y este es su primer login real.
//      Se vincula automáticamente.
//   3. No existe ningún registro con ese correo — nadie lo pre-registró a
//      mano. En vez de rechazarlo, se aprovisiona un perfil base
//      (rol COLABORADOR, sin jefe ni gerencia todavía) y se deja que
//      Gestión Humana lo complete después desde Estructura organizacional.
//      Esto es seguro porque el control de acceso real ya vive en Entra
//      ID: el App Registration tiene "Assignment required" activado y solo
//      el grupo de colaboradores activos está asignado, así que solo
//      alguien de ese grupo llega hasta aquí.
export async function resolverUsuarioParaLogin(
  entraObjectId: string,
  email: string | undefined,
  nombre: string | undefined,
) {
  const existente = await db.usuario.findUnique({ where: { entraObjectId } });
  if (existente) return existente;

  if (!email) return null;

  const usuarioPorCorreo = await db.usuario.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  if (usuarioPorCorreo) {
    if (usuarioPorCorreo.entraObjectId) {
      // Ya estaba vinculado a otra cuenta de Microsoft distinta a la que
      // acaba de autenticarse — es una inconsistencia de datos (dos cuentas
      // con el mismo correo no debería pasar), así que no se toca.
      return usuarioPorCorreo.entraObjectId === entraObjectId ? usuarioPorCorreo : null;
    }
    return db.usuario.update({ where: { id: usuarioPorCorreo.id }, data: { entraObjectId } });
  }

  return db.usuario.create({
    data: {
      entraObjectId,
      email,
      nombre: nombre ?? email,
      activo: true,
      roles: { create: [{ rol: "COLABORADOR" }] },
    },
  });
}
