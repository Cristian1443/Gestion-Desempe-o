import { LineaDeTiempoPeriodo } from "@/components/LineaDeTiempoPeriodo";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { PageHeader } from "@/components/ui/PageHeader";
import { Seccion } from "@/components/ui/Seccion";
import { formatearFecha } from "@/lib/fecha";
import { requireUsuarioAutenticado } from "@/server/auth/rbac";
import { obtenerPendientes } from "@/server/services/pendientes.service";
import { TarjetaPendiente, TarjetaResumen } from "./components";

const NOMBRE_ROL: Record<string, string> = {
  COLABORADOR: "Colaborador",
  JEFE: "Jefe",
  GERENTE: "Gerente",
  GESTION_HUMANA: "Gestión Humana",
  GESTOR_CORPORATIVO: "Gestor de indicadores",
  ADMIN: "Administrador",
};

function saludo(): string {
  // Hora de Bogotá (UTC-5, sin horario de verano).
  const hora = (new Date().getUTCHours() + 24 - 5) % 24;
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default async function InicioPage() {
  const usuario = await requireUsuarioAutenticado();
  const { periodo, franjas, pendientes, propios } = await obtenerPendientes(usuario);

  const primerNombre = usuario.nombre.split(" ")[0] ?? usuario.nombre;
  const roles = usuario.roles.map((r) => NOMBRE_ROL[r]).filter(Boolean).join(" · ");
  const porHacer = pendientes.filter((p) => p.cuenta);
  const informativos = pendientes.filter((p) => !p.cuenta);

  const proximo = franjas?.proximoSeguimiento ?? null;

  return (
    <>
      <PageHeader titulo={`${saludo()}, ${primerNombre}`} subtitulo={roles || undefined} />

      {!periodo || !franjas ? (
        <EstadoVacio titulo="No hay un periodo de evaluación abierto">
          Cuando Gestión Humana abra el periodo, aquí verás qué te toca hacer en cada etapa.
        </EstadoVacio>
      ) : (
        <>
          <LineaDeTiempoPeriodo franjas={franjas} periodo={periodo.nombre} />

          <Seccion
            titulo="Lo que te toca ahora"
            contador={porHacer.length > 0 ? `${porHacer.length} por hacer` : undefined}
          >
            {porHacer.length === 0 ? (
              <EstadoVacio titulo="Estás al día">
                {proximo
                  ? `No tienes nada pendiente. El próximo seguimiento es el ${proximo.numero}, del ${formatearFecha(proximo.fechaInicio)} al ${formatearFecha(proximo.fechaFin)}.`
                  : "No tienes nada pendiente en este momento."}
              </EstadoVacio>
            ) : (
              <ul className="flex flex-col gap-3">
                {porHacer.map((p) => (
                  <TarjetaPendiente key={p.id} pendiente={p} />
                ))}
              </ul>
            )}
          </Seccion>

          {informativos.length > 0 && (
            <Seccion titulo="Para tu información">
              <ul className="flex flex-col gap-3">
                {informativos.map((p) => (
                  <TarjetaPendiente key={p.id} pendiente={p} />
                ))}
              </ul>
            </Seccion>
          )}

          {propios && (
            <Seccion titulo="Mis objetivos">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TarjetaResumen
                  etiqueta="Objetivos aprobados"
                  valor={`${propios.aprobados} de ${propios.total}`}
                  detalle={
                    propios.total === 0
                      ? "Todavía no has propuesto objetivos."
                      : propios.aprobados === propios.total
                        ? "Todos tus objetivos están aprobados."
                        : "El resto está pendiente de aprobación o devuelto."
                  }
                />
              </div>
            </Seccion>
          )}
        </>
      )}
    </>
  );
}
