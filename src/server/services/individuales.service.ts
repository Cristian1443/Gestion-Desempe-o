import { FILTRO_OBJETIVOS_ACTIVOS } from "@/lib/objetivos-config";
import { db } from "@/server/db";
import { aVista, type ObjetivoVista } from "@/server/services/objetivos.service";
import { obtenerPeriodoActual } from "@/server/services/periodos.service";

// Quién ve los objetivos individuales de otras personas:
//  - CORPORACION: la directora (la gerente que no tiene jefe, la cima del
//    organigrama), Talento Humano y Admin ven a toda la Corporación.
//  - GERENCIA: cada gerente ve a toda su gerencia.
export type AlcanceIndividuales = "CORPORACION" | "GERENCIA";

type UsuarioAlcance = { usuarioId: string; roles: string[]; jefeId: string | null };

export function alcanceDe(usuario: UsuarioAlcance): AlcanceIndividuales | null {
  const esGerente = usuario.roles.includes("GERENTE");
  if (usuario.roles.includes("GESTION_HUMANA") || usuario.roles.includes("ADMIN")) return "CORPORACION";
  if (esGerente && usuario.jefeId === null) return "CORPORACION";
  if (esGerente) return "GERENCIA";
  return null;
}

// El periodo abierto o, si no hay, el último cerrado: así los resultados se
// siguen pudiendo consultar y descargar después del cierre.
export async function obtenerPeriodoParaConsulta() {
  return (
    (await obtenerPeriodoActual()) ??
    db.periodo.findFirst({ where: { estado: "CERRADO" }, orderBy: { fechaFin: "desc" } })
  );
}

export async function obtenerUltimoPeriodoCerrado() {
  return db.periodo.findFirst({ where: { estado: "CERRADO" }, orderBy: { fechaFin: "desc" } });
}

export interface PersonaIndividuales {
  usuarioId: string;
  nombre: string;
  cargo: string | null;
  objetivos: ObjetivoVista[];
}

export interface IndividualesPorAlcance {
  alcance: AlcanceIndividuales;
  periodo: { id: string; nombre: string; estado: string } | null;
  grupos: Array<{ gerenciaId: string; gerencia: string; personas: PersonaIndividuales[] }>;
}

export async function obtenerIndividualesPorAlcance(usuario: UsuarioAlcance): Promise<IndividualesPorAlcance | null> {
  const alcance = alcanceDe(usuario);
  if (!alcance) return null;

  const periodo = await obtenerPeriodoParaConsulta();
  if (!periodo) return { alcance, periodo: null, grupos: [] };

  // `select` explícito: sin él Prisma trae también los bytes de la foto de perfil.
  const gerencias = await db.gerencia.findMany({
    where: alcance === "CORPORACION" ? {} : { gerenteId: usuario.usuarioId },
    select: {
      id: true,
      nombre: true,
      colaboradores: { where: { activo: true }, select: { id: true, nombre: true, cargo: true }, orderBy: { nombre: "asc" } },
    },
    orderBy: { nombre: "asc" },
  });

  const idsPersonas = gerencias.flatMap((g) => g.colaboradores.map((c) => c.id));
  const objetivos = await db.objetivo.findMany({
    where: {
      periodoId: periodo.id,
      nivel: "INDIVIDUAL",
      usuarioId: { in: idsPersonas },
      estadoAprobacion: { not: "DEVUELTO" },
      ...FILTRO_OBJETIVOS_ACTIVOS,
    },
    include: {
      seguimientos: {
        orderBy: [{ seguimientoId: "asc" }, { version: "desc" }],
        distinct: ["seguimientoId"],
        include: { seguimiento: { select: { numero: true } }, registrador: { select: { nombre: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const porPersona = new Map<string, ObjetivoVista[]>();
  for (const o of objetivos) {
    if (!o.usuarioId) continue;
    const lista = porPersona.get(o.usuarioId) ?? [];
    lista.push(aVista(o));
    porPersona.set(o.usuarioId, lista);
  }

  return {
    alcance,
    periodo: { id: periodo.id, nombre: periodo.nombre, estado: periodo.estado },
    grupos: gerencias
      .filter((g) => g.colaboradores.length > 0)
      .map((g) => ({
        gerenciaId: g.id,
        gerencia: g.nombre,
        personas: g.colaboradores.map((c) => ({
          usuarioId: c.id,
          nombre: c.nombre,
          cargo: c.cargo,
          objetivos: porPersona.get(c.id) ?? [],
        })),
      })),
  };
}

// ¿Puede esta persona ver / descargar el resultado de `personaId`? Ella misma, su
// jefe directo, el gerente de su gerencia y quien ve a toda la Corporación.
export async function puedeVerResultadoDe(usuario: UsuarioAlcance, personaId: string): Promise<boolean> {
  if (usuario.usuarioId === personaId) return true;
  const persona = await db.usuario.findUnique({
    where: { id: personaId },
    select: { jefeId: true, gerenciaId: true },
  });
  if (!persona) return false;
  if (persona.jefeId === usuario.usuarioId) return true;

  const alcance = alcanceDe(usuario);
  if (alcance === "CORPORACION") return true;
  if (alcance === "GERENCIA" && persona.gerenciaId) {
    const gerencia = await db.gerencia.findFirst({
      where: { id: persona.gerenciaId, gerenteId: usuario.usuarioId },
      select: { id: true },
    });
    return gerencia !== null;
  }
  return false;
}

export async function tieneObjetivosAprobados(periodoId: string, usuarioId: string): Promise<boolean> {
  const cantidad = await db.objetivo.count({
    where: { periodoId, nivel: "INDIVIDUAL", usuarioId, estadoAprobacion: "APROBADO", ...FILTRO_OBJETIVOS_ACTIVOS },
  });
  return cantidad > 0;
}
