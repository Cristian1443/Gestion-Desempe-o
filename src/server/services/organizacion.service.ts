import type { Rol } from "@prisma/client";
import { db } from "@/server/db";

export class ErrorOrganizacion extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErrorOrganizacion";
  }
}

// --- Gerencias ---

export async function listarGerencias() {
  return db.gerencia.findMany({
    include: {
      gerente: { select: { id: true, nombre: true } },
      _count: { select: { colaboradores: true } },
    },
    orderBy: { nombre: "asc" },
  });
}

export async function crearGerencia(nombre: string) {
  const existente = await db.gerencia.findUnique({ where: { nombre } });
  if (existente) {
    throw new ErrorOrganizacion(`Ya existe una gerencia llamada "${nombre}".`);
  }
  return db.gerencia.create({ data: { nombre } });
}

// Asignar a alguien como gerente le da el rol GERENTE si todavía no lo
// tenía — es una consecuencia directa de la asignación, no un paso manual
// aparte que se pueda olvidar.
export async function asignarGerente(gerenciaId: string, usuarioId: string) {
  const [gerencia, usuario] = await Promise.all([
    db.gerencia.findUnique({ where: { id: gerenciaId } }),
    db.usuario.findUnique({ where: { id: usuarioId } }),
  ]);
  if (!gerencia) throw new ErrorOrganizacion("La gerencia no existe.");
  if (!usuario || !usuario.activo) throw new ErrorOrganizacion("El usuario no existe o está inactivo.");

  await db.$transaction([
    db.gerencia.update({ where: { id: gerenciaId }, data: { gerenteId: usuarioId } }),
    db.usuarioRol.upsert({
      where: { usuarioId_rol: { usuarioId, rol: "GERENTE" } },
      update: {},
      create: { usuarioId, rol: "GERENTE" },
    }),
  ]);
}

// --- Usuarios ---

export async function listarUsuarios() {
  // `select` explícito a propósito — sin esto, Prisma trae también `foto`
  // (los bytes de la imagen de perfil) para las 46+ personas de golpe. Esta
  // pantalla no muestra fotos, y esos bytes, serializados en el payload de
  // la página, inflaban la respuesta a decenas de MB (confirmado: 70-90MB
  // en producción), causando que la página tardara más de un minuto en
  // cargar. Nunca usar `include` a secas en consultas de Usuario que
  // devuelvan varias filas a una página — siempre `select` explícito.
  return db.usuario.findMany({
    select: {
      id: true,
      nombre: true,
      email: true,
      cargo: true,
      activo: true,
      entraObjectId: true,
      gerencia: { select: { id: true, nombre: true } },
      jefe: { select: { id: true, nombre: true } },
      roles: true,
    },
    orderBy: { nombre: "asc" },
  });
}

export interface DatosUsuario {
  nombre: string;
  email: string;
  cargo: string | null;
  gerenciaId: string | null;
  jefeId: string | null;
  roles: Rol[];
}

async function validarJefeSinCiclo(usuarioId: string | null, jefeId: string | null) {
  if (!jefeId || !usuarioId) return;
  if (jefeId === usuarioId) {
    throw new ErrorOrganizacion("Un colaborador no puede ser su propio jefe.");
  }

  // Camina la cadena de jefes hacia arriba desde el jefe propuesto: si en
  // algún punto llega de vuelta a `usuarioId`, asignarlo crearía un ciclo
  // (ej. A es jefe de B, y se intenta hacer a B jefe de A).
  let actual: string | null = jefeId;
  const visitados = new Set<string>();
  while (actual) {
    if (actual === usuarioId) {
      throw new ErrorOrganizacion(
        "Esa asignación crearía un ciclo en la cadena de jefes (alguien terminaría siendo jefe de su propio jefe).",
      );
    }
    if (visitados.has(actual)) break;
    visitados.add(actual);
    const idActual: string = actual;
    const siguiente: { jefeId: string | null } | null = await db.usuario.findUnique({
      where: { id: idActual },
      select: { jefeId: true },
    });
    actual = siguiente?.jefeId ?? null;
  }
}

// Da de alta a un colaborador antes de que exista su cuenta vinculada
// (`entraObjectId` queda en null — ver comentario en el schema y en
// `resolverUsuarioParaLogin`). Es la operación central de "conectar
// empleados con sus jefes": aquí es donde Talento Humano arma el
// organigrama real.
export async function crearUsuario(datos: DatosUsuario) {
  const existente = await db.usuario.findUnique({ where: { email: datos.email } });
  if (existente) {
    throw new ErrorOrganizacion(`Ya existe un usuario con el correo "${datos.email}".`);
  }
  if (datos.roles.length === 0) {
    throw new ErrorOrganizacion("Selecciona al menos un rol.");
  }

  await validarJefeSinCiclo(null, datos.jefeId);

  return db.usuario.create({
    data: {
      nombre: datos.nombre,
      email: datos.email,
      cargo: datos.cargo,
      gerenciaId: datos.gerenciaId,
      jefeId: datos.jefeId,
      activo: true,
      roles: { create: datos.roles.map((rol) => ({ rol })) },
    },
  });
}

export interface ActualizacionUsuario {
  cargo?: string | null;
  gerenciaId?: string | null;
  jefeId?: string | null;
  roles?: Rol[];
  activo?: boolean;
}

export async function actualizarUsuario(usuarioId: string, cambios: ActualizacionUsuario) {
  const usuario = await db.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) throw new ErrorOrganizacion("El usuario no existe.");

  if (cambios.jefeId !== undefined) {
    await validarJefeSinCiclo(usuarioId, cambios.jefeId);
  }

  if (cambios.activo === false) {
    const [esGerente, tieneColaboradores] = await Promise.all([
      db.gerencia.findFirst({ where: { gerenteId: usuarioId } }),
      db.usuario.findFirst({ where: { jefeId: usuarioId, activo: true } }),
    ]);
    if (esGerente) {
      throw new ErrorOrganizacion(
        `No puedes desactivar a alguien que sigue siendo gerente de "${esGerente.nombre}". Asigna otro gerente primero.`,
      );
    }
    if (tieneColaboradores) {
      throw new ErrorOrganizacion(
        "No puedes desactivar a alguien que todavía tiene colaboradores activos a cargo. Reasígnalos a otro jefe primero.",
      );
    }
  }

  return db.$transaction(async (tx) => {
    const actualizado = await tx.usuario.update({
      where: { id: usuarioId },
      data: {
        cargo: cambios.cargo,
        gerenciaId: cambios.gerenciaId,
        jefeId: cambios.jefeId,
        activo: cambios.activo,
      },
    });

    if (cambios.roles) {
      if (cambios.roles.length === 0) {
        throw new ErrorOrganizacion("Selecciona al menos un rol.");
      }
      await tx.usuarioRol.deleteMany({ where: { usuarioId } });
      await tx.usuarioRol.createMany({
        data: cambios.roles.map((rol) => ({ usuarioId, rol })),
      });
    }

    return actualizado;
  });
}
