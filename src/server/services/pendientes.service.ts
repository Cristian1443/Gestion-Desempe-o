import { formatearFecha } from "@/lib/fecha";
import { diasHasta, textoDias } from "@/lib/franja";
import { etiquetaMes } from "@/lib/mes";
import {
  contarPorAmbito,
  ordenarPendientes,
  pluralizar,
  prioridadPorDias,
  type AmbitoPendiente,
  type Pendiente,
} from "@/lib/pendientes";
import type { UsuarioSesion } from "@/server/auth/rbac";
import { obtenerMiGerencia } from "@/server/services/gerencia.service";
import { obtenerIndicadores } from "@/server/services/indicadores.service";
import { obtenerMiEquipo } from "@/server/services/equipo.service";
import { obtenerMisObjetivos } from "@/server/services/objetivos.service";
import {
  evaluarCierre,
  obtenerContextoFranjas,
  obtenerPeriodoActual,
  type ContextoFranjas,
} from "@/server/services/periodos.service";

// "Lo que te toca": todo lo que esta persona tiene pendiente hoy, según sus
// roles. Solo lee y reutiliza los servicios de cada pantalla — las reglas de
// negocio no se repiten aquí, solo se interpretan en forma de tareas.
export interface ResumenPendientes {
  periodo: { id: string; nombre: string } | null;
  franjas: ContextoFranjas | null;
  pendientes: Pendiente[];
  porAmbito: Partial<Record<AmbitoPendiente, number>>;
  // Cómo van los objetivos individuales de la propia persona (para el resumen de Inicio).
  propios: { total: number; aprobados: number } | null;
}

type Borrador = Omit<Pendiente, "cuenta" | "limite" | "prioridad"> &
  Partial<Pick<Pendiente, "cuenta" | "limite" | "prioridad">>;

function crear(b: Borrador): Pendiente {
  return { prioridad: "AHORA", limite: null, cuenta: true, ...b };
}

// "hasta el 31 dic 2026 (quedan 3 días)" y los días que faltan.
function limiteDe(fin: Date): { texto: string; dias: number } {
  const dias = diasHasta(fin);
  return { texto: `hasta el ${formatearFecha(fin)} (${textoDias(dias)})`, dias };
}

export async function obtenerPendientes(usuario: UsuarioSesion): Promise<ResumenPendientes> {
  const periodo = await obtenerPeriodoActual();
  const roles = new Set(usuario.roles);
  const esGestionHumana = roles.has("GESTION_HUMANA") || roles.has("ADMIN");
  const editaIndicadores = esGestionHumana || roles.has("GESTOR_CORPORATIVO");

  if (!periodo) {
    const pendientes = esGestionHumana
      ? [
          crear({
            id: "sin-periodo",
            ambito: "administracion",
            titulo: "No hay un periodo abierto",
            detalle: "Mientras no haya un periodo abierto, nadie puede cargar objetivos ni registrar seguimientos.",
            href: "/administracion",
            accion: "Abrir un periodo",
          }),
        ]
      : [];
    return { periodo: null, franjas: null, pendientes, porAmbito: contarPorAmbito(pendientes), propios: null };
  }

  const franjas = await obtenerContextoFranjas(periodo.id);
  const enCurso = franjas.seguimientoEnCurso;
  const cumplimientoEnCurso = franjas.cumplimiento?.estado === "EN_CURSO";
  const limiteSeguimiento = enCurso ? limiteDe(enCurso.fechaFin) : null;
  const limiteCumplimiento = cumplimientoEnCurso && franjas.cumplimiento ? limiteDe(franjas.cumplimiento.fin) : null;

  const pendientes: Pendiente[] = [];
  let propios: ResumenPendientes["propios"] = null;

  // --- Toda persona: sus propios objetivos ---
  const mis = await obtenerMisObjetivos(usuario.usuarioId);
  if (mis) {
    const individuales = mis.individuales;
    propios = {
      total: individuales.length,
      aprobados: individuales.filter((o) => o.estadoAprobacion === "APROBADO").length,
    };
    const devueltos = individuales.filter((o) => o.estadoAprobacion === "DEVUELTO");
    const porAprobar = individuales.filter((o) => o.estadoAprobacion === "PENDIENTE_APROBACION");

    if (individuales.length === 0) {
      pendientes.push(
        crear({
          id: "proponer-objetivos",
          ambito: "mis-objetivos",
          titulo: "Propón tus objetivos del periodo",
          detalle: "Tu jefe los revisa y los aprueba; hasta entonces no se les puede hacer seguimiento.",
          href: "/mis-objetivos",
          accion: "Proponer objetivos",
        }),
      );
    } else if (devueltos.length > 0) {
      pendientes.push(
        crear({
          id: "corregir-devueltos",
          prioridad: "URGENTE",
          ambito: "mis-objetivos",
          titulo: `Tu jefe devolvió ${pluralizar(devueltos.length, "objetivo", "objetivos")}`,
          detalle: "Corrígelos según sus comentarios y vuelve a enviarlos.",
          href: "/mis-objetivos",
          accion: "Corregir objetivos",
        }),
      );
    } else if (porAprobar.length > 0) {
      pendientes.push(
        crear({
          id: "esperando-aprobacion",
          prioridad: "PROXIMO",
          ambito: "mis-objetivos",
          titulo: "Tus objetivos esperan la aprobación de tu jefe",
          detalle: mis.nombreJefe ? `${mis.nombreJefe} los está revisando.` : "Tu jefe los está revisando.",
          href: "/mis-objetivos",
          accion: "Ver mis objetivos",
          cuenta: false,
        }),
      );
    }

    if (cumplimientoEnCurso && limiteCumplimiento && individuales.some((o) => o.estadoAprobacion === "APROBADO")) {
      pendientes.push(
        crear({
          id: "mi-cumplimiento",
          prioridad: "PROXIMO",
          ambito: "mis-objetivos",
          titulo: "Tu jefe está poniendo tu % de cumplimiento",
          detalle: "Es la última etapa del periodo; puedes revisar tus objetivos mientras tanto.",
          limite: limiteCumplimiento.texto,
          href: "/mis-objetivos",
          accion: "Ver mis objetivos",
          cuenta: false,
        }),
      );
    }
  }

  // --- Jefe: aprobar, hacer seguimiento y poner el % ---
  if (roles.has("JEFE")) {
    const equipo = await obtenerMiEquipo(usuario.usuarioId);
    if (equipo) {
      const objetivos = equipo.colaboradores.flatMap((c) => c.objetivos.map((o) => ({ ...o, colaboradorId: c.usuarioId })));

      const porAprobar = objetivos.filter((o) => o.estadoAprobacion === "PENDIENTE_APROBACION");
      if (porAprobar.length > 0) {
        const personas = new Set(porAprobar.map((o) => o.colaboradorId)).size;
        pendientes.push(
          crear({
            id: "aprobar-objetivos",
            ambito: "mi-equipo",
            titulo: `Aprueba los objetivos de ${pluralizar(personas, "persona", "personas")}`,
            detalle: `${pluralizar(porAprobar.length, "objetivo espera", "objetivos esperan")} tu revisión.`,
            href: "/mi-equipo",
            accion: "Revisar objetivos",
          }),
        );
      }

      const aprobados = objetivos.filter((o) => o.estadoAprobacion === "APROBADO");

      if (enCurso && limiteSeguimiento) {
        const sinRegistro = aprobados.filter((o) => !o.seguimientos.some((s) => s.numero === enCurso.numero));
        if (sinRegistro.length > 0) {
          const personas = new Set(sinRegistro.map((o) => o.colaboradorId)).size;
          pendientes.push(
            crear({
              id: "seguimiento-equipo",
              prioridad: prioridadPorDias(limiteSeguimiento.dias),
              ambito: "mi-equipo",
              titulo: `Registra el seguimiento ${enCurso.numero} de tu equipo`,
              detalle: `Faltan ${pluralizar(sinRegistro.length, "objetivo", "objetivos")} de ${pluralizar(personas, "persona", "personas")}.`,
              limite: limiteSeguimiento.texto,
              href: "/mi-equipo",
              accion: "Registrar seguimiento",
            }),
          );
        }
      }

      if (cumplimientoEnCurso && limiteCumplimiento) {
        const sinResultado = aprobados.filter((o) =>
          o.tipoIndividual === "DESARROLLO" ? o.cumplioDesarrollo === null : o.calificacionFinal === null,
        );
        if (sinResultado.length > 0) {
          pendientes.push(
            crear({
              id: "cumplimiento-equipo",
              prioridad: prioridadPorDias(limiteCumplimiento.dias),
              ambito: "mi-equipo",
              titulo: "Pon el % de cumplimiento de tu equipo",
              detalle: `Faltan ${pluralizar(sinResultado.length, "objetivo", "objetivos")} por calificar.`,
              limite: limiteCumplimiento.texto,
              href: "/mi-equipo",
              accion: "Calificar objetivos",
            }),
          );
        }
      }

      const sinObjetivos = equipo.colaboradores.filter((c) => c.objetivos.length === 0);
      if (sinObjetivos.length > 0) {
        pendientes.push(
          crear({
            id: "equipo-sin-objetivos",
            prioridad: "PROXIMO",
            ambito: "mi-equipo",
            titulo: `${pluralizar(sinObjetivos.length, "persona de tu equipo aún no propone", "personas de tu equipo aún no proponen")} objetivos`,
            detalle: sinObjetivos
              .slice(0, 3)
              .map((c) => c.nombre)
              .join(", ") + (sinObjetivos.length > 3 ? ` y ${sinObjetivos.length - 3} más.` : "."),
            href: "/mi-equipo",
            accion: "Ver mi equipo",
            cuenta: false,
          }),
        );
      }
    }
  }

  // --- Gerente: indicadores de su gerencia ---
  if (roles.has("GERENTE")) {
    const gerencia = await obtenerMiGerencia(usuario.usuarioId);
    if (gerencia) {
      const { indicadores, tope } = gerencia;

      if (indicadores.length < tope) {
        pendientes.push(
          crear({
            id: "cargar-indicadores-gerencia",
            ambito: "mi-gerencia",
            titulo: `Carga los indicadores de tu gerencia (${indicadores.length} de ${tope})`,
            detalle: "Son sin peso: en cada seguimiento registras su avance y al final marcas Cumple o No cumple.",
            href: "/mi-gerencia",
            accion: "Cargar indicadores",
          }),
        );
      }

      if (enCurso && limiteSeguimiento) {
        const sinRegistro = indicadores.filter(
          (i) => i.cumplido === null && !i.seguimientos.some((s) => s.numero === enCurso.numero),
        );
        if (sinRegistro.length > 0) {
          pendientes.push(
            crear({
              id: "seguimiento-gerencia",
              prioridad: prioridadPorDias(limiteSeguimiento.dias),
              ambito: "mi-gerencia",
              titulo: `Registra el seguimiento ${enCurso.numero} de tu gerencia`,
              detalle: `Falta el avance de ${pluralizar(sinRegistro.length, "indicador", "indicadores")}.`,
              limite: limiteSeguimiento.texto,
              href: "/mi-gerencia",
              accion: "Registrar seguimiento",
            }),
          );
        }
      }

      if (cumplimientoEnCurso && limiteCumplimiento) {
        const sinResultado = indicadores.filter((i) => i.cumplido === null);
        if (sinResultado.length > 0) {
          pendientes.push(
            crear({
              id: "resultado-gerencia",
              prioridad: prioridadPorDias(limiteCumplimiento.dias),
              ambito: "mi-gerencia",
              titulo: "Marca el resultado final de tus indicadores",
              detalle: `Falta Cumple o No cumple en ${pluralizar(sinResultado.length, "indicador", "indicadores")}.`,
              limite: limiteCumplimiento.texto,
              href: "/mi-gerencia",
              accion: "Marcar resultado",
            }),
          );
        }
      }
    }
  }

  // --- Quien carga los indicadores de la empresa ---
  if (editaIndicadores) {
    const empresa = await obtenerIndicadores();
    if (empresa) {
      const { indicadores, tope, mesActual, mesesRegistrables } = empresa;

      if (indicadores.length < tope) {
        pendientes.push(
          crear({
            id: "cargar-indicadores-empresa",
            ambito: "indicadores",
            titulo: `Carga los indicadores de la empresa (${indicadores.length} de ${tope})`,
            detalle: "Siempre son 8 para toda la Corporación; el periodo no se puede cerrar con menos.",
            href: "/indicadores",
            accion: "Cargar indicadores",
          }),
        );
      }

      if (mesesRegistrables.includes(mesActual)) {
        const sinAvance = indicadores.filter((i) => i.cumplido === null && !i.avances.some((a) => a.mes === mesActual));
        if (sinAvance.length > 0) {
          pendientes.push(
            crear({
              id: "avance-mensual",
              ambito: "indicadores",
              titulo: `Registra el avance de ${etiquetaMes(mesActual)}`,
              detalle: `Falta en ${pluralizar(sinAvance.length, "indicador", "indicadores")} de la empresa.`,
              href: "/indicadores",
              accion: "Registrar avance",
            }),
          );
        }
      }

      if (cumplimientoEnCurso && limiteCumplimiento) {
        const sinResultado = indicadores.filter((i) => i.cumplido === null);
        if (sinResultado.length > 0) {
          pendientes.push(
            crear({
              id: "resultado-empresa",
              prioridad: prioridadPorDias(limiteCumplimiento.dias),
              ambito: "indicadores",
              titulo: "Marca el resultado final de los indicadores de la empresa",
              detalle: `Falta Cumple o No cumple en ${pluralizar(sinResultado.length, "indicador", "indicadores")}.`,
              limite: limiteCumplimiento.texto,
              href: "/indicadores",
              accion: "Marcar resultado",
            }),
          );
        }
      }
    }
  }

  // --- Gestión Humana / Admin: dejar listo el periodo y cerrarlo ---
  if (esGestionHumana) {
    if (!enCurso && !franjas.proximoSeguimiento) {
      pendientes.push(
        crear({
          id: "definir-seguimiento",
          prioridad: "URGENTE",
          ambito: "administracion",
          titulo: "No hay un seguimiento que incluya hoy",
          detalle: "Sin un seguimiento en curso, nadie puede registrar avances. Agrega o ajusta uno.",
          href: "/administracion",
          accion: "Definir seguimientos",
        }),
      );
    }

    if (!franjas.cumplimiento) {
      pendientes.push(
        crear({
          id: "definir-franja-final",
          ambito: "administracion",
          titulo: "Define la franja del % de cumplimiento",
          detalle: "Sin ella no se puede calificar ni marcar Cumple / No cumple, ni cerrar el periodo.",
          href: "/administracion",
          accion: "Definir franja",
        }),
      );
    } else if (franjas.cumplimiento.estado === "FINALIZADA") {
      const { faltaCargar, sinResultado } = await evaluarCierre(periodo.id);
      const faltantes = faltaCargar.length + Object.keys(sinResultado).length;
      pendientes.push(
        crear({
          id: "cerrar-periodo",
          ambito: "administracion",
          titulo: faltantes === 0 ? "El periodo está listo para cerrarse" : "Antes de cerrar el periodo faltan cosas",
          detalle:
            faltantes === 0
              ? "Todos los indicadores están cargados y todos los objetivos tienen su resultado."
              : [
                  ...faltaCargar.map((f) => `Falta cargar ${f}`),
                  ...Object.entries(sinResultado).map(([nivel, n]) => `${n} ${nivel.toLowerCase()} sin resultado`),
                ].join(" · "),
          href: "/administracion",
          accion: faltantes === 0 ? "Cerrar el periodo" : "Ver el periodo",
        }),
      );
    }
  }

  const ordenados = ordenarPendientes(pendientes);
  return {
    periodo: { id: periodo.id, nombre: periodo.nombre },
    franjas,
    pendientes: ordenados,
    porAmbito: contarPorAmbito(ordenados),
    propios,
  };
}
