// Sincroniza la estructura organizacional (usuarios, gerencias, jefes) contra
// el grupo real de Entra ID asignado a la aplicación ("Usuarios_activos"),
// en vez de depender únicamente de quién aparecía en la planilla de objetivos
// de SharePoint. Cualquier persona del grupo debe poder entrar al sistema —
// este script se asegura de que ya esté pre-registrada, en vez de esperar a
// que se auto-cree en su primer login.
//
// También mantiene al día a quien ya existía: si en Entra ID cambia el
// cargo, el nombre, el department (gerencia), el estado activo/inactivo, la
// foto de perfil, o el jefe (manager) de alguien, la próxima corrida de este
// script lo refleja acá. Por eso está pensado para correr por cron de forma
// periódica (ver DEPLOY-QA.md), no solo a mano una vez.
//
// Requiere en .env/.env.local: AUTH_MICROSOFT_ENTRA_ID_ID,
// AUTH_MICROSOFT_ENTRA_ID_SECRET, AUTH_MICROSOFT_ENTRA_ID_ISSUER, y que el
// App Registration tenga los permisos de Application "User.Read.All" y
// "GroupMember.Read.All" de Microsoft Graph con consentimiento de
// administrador otorgado.
//
// Idempotente: se puede correr varias veces sin duplicar nada; siempre trae
// el estado más reciente del grupo y del directorio.
//
// Uso: node --env-file=.env.local scripts/migracion-sharepoint/sincronizar-grupo.mjs

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const TENANT_ID = new URL(process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER).pathname.split("/")[1];
const CLIENT_ID = process.env.AUTH_MICROSOFT_ENTRA_ID_ID;
const CLIENT_SECRET = process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET;
const NOMBRE_GRUPO = "Usuarios_activos";

// Cuentas que nunca deben desactivarse aunque no aparezcan en el grupo (la
// cuenta de arranque del sistema no es una persona real del grupo).
const CORREOS_EXENTOS_DE_DESACTIVAR = new Set(["iibservices2@investinbogota.org"]);

// La gerencia fue renombrada en Entra ID después de la migración original.
const RENOMBRES_GERENCIA = {
  "Gerencia de Apoyo Estrategico": "Gerencia de Estrategia y Competitividad",
};

const REPORTE = {
  gerenciasRenombradas: [],
  usuariosCreados: [],
  usuariosActualizados: [],
  usuariosDesactivados: [],
  advertencias: [],
};

async function obtenerToken() {
  const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default",
    }),
  });
  const datos = await res.json();
  if (!res.ok) throw new Error(`Token error: ${JSON.stringify(datos)}`);
  return datos.access_token;
}

async function obtenerIdDelGrupo(token) {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/groups?$filter=${encodeURIComponent(`displayName eq '${NOMBRE_GRUPO}'`)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const datos = await res.json();
  if (!res.ok) throw new Error(`Error buscando el grupo: ${JSON.stringify(datos)}`);
  const grupo = datos.value[0];
  if (!grupo) throw new Error(`No se encontró un grupo llamado "${NOMBRE_GRUPO}".`);
  return grupo.id;
}

async function obtenerMiembrosDelGrupo(token, grupoId) {
  const miembros = [];
  let url =
    `https://graph.microsoft.com/v1.0/groups/${grupoId}/members` +
    "?$select=id,displayName,mail,userPrincipalName,jobTitle,department,accountEnabled&$top=999";
  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const datos = await res.json();
    if (!res.ok) throw new Error(`Error listando miembros del grupo: ${JSON.stringify(datos)}`);
    miembros.push(...datos.value);
    url = datos["@odata.nextLink"] ?? null;
  }
  return miembros;
}

async function obtenerManager(token, userId) {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${userId}/manager?$select=mail,userPrincipalName`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (res.status === 404) return null;
  const datos = await res.json();
  if (!res.ok) return null;
  return (datos.mail || datos.userPrincipalName || "").toLowerCase();
}

// No todos en Entra ID tienen foto configurada — un 404 es normal, no un
// error. Cualquier otra falla tampoco debe tumbar la sincronización
// completa por una sola persona.
async function obtenerFoto(token, userId) {
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${userId}/photo/$value`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const tipo = res.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, tipo };
}

async function main() {
  console.log("Autenticando con Microsoft Graph...");
  const token = await obtenerToken();
  const grupoId = await obtenerIdDelGrupo(token);
  console.log(`Grupo "${NOMBRE_GRUPO}" encontrado (${grupoId}). Descargando miembros...`);
  const miembros = await obtenerMiembrosDelGrupo(token, grupoId);
  console.log(`El grupo tiene ${miembros.length} miembros.`);

  // --- Paso 1: renombrar gerencias que cambiaron de nombre en Entra ID ---
  for (const [nombreViejo, nombreNuevo] of Object.entries(RENOMBRES_GERENCIA)) {
    const gerenciaVieja = await db.gerencia.findUnique({ where: { nombre: nombreViejo } });
    if (gerenciaVieja) {
      await db.gerencia.update({ where: { id: gerenciaVieja.id }, data: { nombre: nombreNuevo } });
      REPORTE.gerenciasRenombradas.push(`${nombreViejo} -> ${nombreNuevo}`);
    }
  }

  const gerencias = await db.gerencia.findMany();
  const gerenciaIdPorNombre = new Map(gerencias.map((g) => [g.nombre, g.id]));

  // --- Paso 2: desactivar en el sistema a quien ya no está en el grupo ---
  // (Entra ID ya les bloquea el acceso a la app; el sistema debe reflejar lo
  // mismo en vez de dejarlos marcados como activos.)
  const correosDelGrupo = new Set(
    miembros.map((m) => (m.mail || m.userPrincipalName || "").toLowerCase()),
  );
  const usuariosActivosEnBD = await db.usuario.findMany({ where: { activo: true } });
  for (const usuario of usuariosActivosEnBD) {
    if (CORREOS_EXENTOS_DE_DESACTIVAR.has(usuario.email.toLowerCase())) continue;
    if (!correosDelGrupo.has(usuario.email.toLowerCase())) {
      await db.usuario.update({ where: { id: usuario.id }, data: { activo: false } });
      REPORTE.usuariosDesactivados.push(`${usuario.nombre} (${usuario.email})`);
    }
  }

  // --- Paso 3: crear a quien está en el grupo pero no en el sistema ---
  const usuariosExistentes = await db.usuario.findMany({ select: { email: true } });
  const correosExistentes = new Set(usuariosExistentes.map((u) => u.email.toLowerCase()));
  const faltantes = miembros.filter(
    (m) => !correosExistentes.has((m.mail || m.userPrincipalName || "").toLowerCase()),
  );

  for (const miembro of faltantes) {
    const correo = (miembro.mail || miembro.userPrincipalName || "").toLowerCase();
    if (!correo) {
      REPORTE.advertencias.push(`"${miembro.displayName}" no tiene correo en Entra ID — se omitió.`);
      continue;
    }

    const gerenciaId = miembro.department ? gerenciaIdPorNombre.get(miembro.department) : undefined;
    if (miembro.department && !gerenciaId) {
      REPORTE.advertencias.push(
        `${miembro.displayName}: su departamento "${miembro.department}" no coincide con ninguna gerencia registrada.`,
      );
    }

    const correoJefe = await obtenerManager(token, miembro.id);

    await db.usuario.create({
      data: {
        email: correo,
        nombre: miembro.displayName,
        cargo: miembro.jobTitle || null,
        activo: miembro.accountEnabled,
        gerenciaId: gerenciaId ?? null,
        roles: { create: [{ rol: "COLABORADOR" }] },
      },
    });
    REPORTE.usuariosCreados.push(`${miembro.displayName} (${correo})`);

    // El jefe se asigna en una segunda pasada (abajo) una vez que todos los
    // usuarios nuevos ya existen — por si dos personas nuevas se reportan
    // entre sí en el mismo lote.
  }

  // --- Paso 3.5: actualizar a quien ya existía en el sistema, por si su
  // cargo, nombre, gerencia (department) o estado cambiaron en Entra ID
  // desde la última sincronización. Entra ID es la fuente de verdad para
  // estos campos — nunca la planilla ni lo que se haya editado a mano acá.
  // La gerencia solo se actualiza cuando el department coincide con una
  // gerencia conocida (nunca se limpia a null si no coincide o viene vacío,
  // para no perder asignaciones manuales como personas sin department en
  // Entra ID pero ubicadas a mano en una gerencia real). ---
  const usuariosPorCorreo = new Map(
    (await db.usuario.findMany()).map((u) => [u.email.toLowerCase(), u]),
  );

  for (const miembro of miembros) {
    const correo = (miembro.mail || miembro.userPrincipalName || "").toLowerCase();
    const actual = usuariosPorCorreo.get(correo);
    if (!actual) continue; // se acaba de crear arriba, ya quedó al día

    const nombreNuevo = miembro.displayName || actual.nombre;
    const cargoNuevo = miembro.jobTitle || null;
    const activoNuevo = miembro.accountEnabled;
    const gerenciaIdNuevo = miembro.department
      ? (gerenciaIdPorNombre.get(miembro.department) ?? actual.gerenciaId)
      : actual.gerenciaId;

    if (miembro.department && !gerenciaIdPorNombre.get(miembro.department)) {
      REPORTE.advertencias.push(
        `${miembro.displayName}: su departamento "${miembro.department}" no coincide con ninguna gerencia registrada.`,
      );
    }

    const cambios = {};
    if (nombreNuevo !== actual.nombre) cambios.nombre = nombreNuevo;
    if (cargoNuevo !== actual.cargo) cambios.cargo = cargoNuevo;
    if (activoNuevo !== actual.activo) cambios.activo = activoNuevo;
    if (gerenciaIdNuevo !== actual.gerenciaId) cambios.gerenciaId = gerenciaIdNuevo;

    if (Object.keys(cambios).length > 0) {
      await db.usuario.update({ where: { id: actual.id }, data: cambios });
      REPORTE.usuariosActualizados.push({ nombre: actual.nombre, correo, cambios });
    }
  }

  // --- Paso 4: asignar jefe (+ rol JEFE) a todo el que tenga manager real,
  // no solo a los recién creados — por si alguien ya existente nunca tuvo
  // jefe asignado. ---
  const usuarioIdPorCorreo = new Map(
    (await db.usuario.findMany({ select: { id: true, email: true } })).map((u) => [
      u.email.toLowerCase(),
      u.id,
    ]),
  );

  for (const miembro of miembros) {
    const correo = (miembro.mail || miembro.userPrincipalName || "").toLowerCase();
    const usuarioId = usuarioIdPorCorreo.get(correo);
    if (!usuarioId) continue;

    const correoJefe = await obtenerManager(token, miembro.id);
    if (!correoJefe) continue;
    const jefeId = usuarioIdPorCorreo.get(correoJefe);
    if (!jefeId || jefeId === usuarioId) continue;

    const usuarioActual = await db.usuario.findUnique({ where: { id: usuarioId } });
    if (usuarioActual.jefeId !== jefeId) {
      await db.usuario.update({ where: { id: usuarioId }, data: { jefeId } });
    }

    await db.usuarioRol.upsert({
      where: { usuarioId_rol: { usuarioId: jefeId, rol: "JEFE" } },
      update: {},
      create: { usuarioId: jefeId, rol: "JEFE" },
    });
  }

  // --- Paso 5: traer/actualizar la foto de perfil de cada quien desde
  // Microsoft Graph (la misma que se ve en Teams/Outlook). No se intenta
  // detectar cambios de forma fina — se vuelve a descargar cada corrida;
  // son archivos chiquitos (unos KB) y el grupo no es tan grande como para
  // que valga la pena la complejidad extra de un caché por ETag. ---
  let fotosActualizadas = 0;
  for (const miembro of miembros) {
    const correo = (miembro.mail || miembro.userPrincipalName || "").toLowerCase();
    const usuarioId = usuarioIdPorCorreo.get(correo);
    if (!usuarioId) continue;

    const foto = await obtenerFoto(token, miembro.id);
    if (!foto) continue;

    await db.usuario.update({
      where: { id: usuarioId },
      data: { foto: foto.buffer, fotoTipo: foto.tipo, fotoActualizada: new Date() },
    });
    fotosActualizadas++;
  }
  REPORTE.fotosActualizadas = fotosActualizadas;

  console.log("\n=== REPORTE DE SINCRONIZACIÓN CON EL GRUPO ===");
  console.log(JSON.stringify(REPORTE, null, 2));
}

main()
  .catch((err) => {
    console.error("FALLÓ LA SINCRONIZACIÓN:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
