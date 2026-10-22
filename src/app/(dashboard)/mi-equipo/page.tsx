import { LineaDeTiempoPeriodo } from "@/components/LineaDeTiempoPeriodo";
import { Callout } from "@/components/ui/Callout";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatearFecha } from "@/lib/fecha";
import { aFranjaUI } from "@/lib/franja-ui";
import { pluralizar } from "@/lib/pendientes";
import { requireRol } from "@/server/auth/rbac";
import { obtenerMiEquipo } from "@/server/services/equipo.service";
import { EquipoFiltrable } from "./EquipoFiltrable";

export default async function MiEquipoPage() {
  const jefe = await requireRol("JEFE");
  const datos = await obtenerMiEquipo(jefe.usuarioId);

  if (!datos) {
    return (
      <>
        <PageHeader titulo="Mi equipo" />
        <EstadoVacio titulo="No hay un periodo de evaluación abierto">
          Cuando Gestión Humana abra el periodo, aquí aprobarás y harás seguimiento a los objetivos de tu equipo.
        </EstadoVacio>
      </>
    );
  }

  const { franjas, colaboradores } = datos;
  const objetivos = colaboradores.flatMap((c) => c.objetivos);
  const porAprobar = objetivos.filter((o) => o.estadoAprobacion === "PENDIENTE_APROBACION");
  const enCurso = franjas.seguimientoEnCurso;
  const sinRegistroEnCurso = enCurso
    ? objetivos.filter(
        (o) => o.estadoAprobacion === "APROBADO" && !o.seguimientos.some((s) => s.numero === enCurso.numero),
      )
    : [];

  return (
    <>
      <PageHeader
        titulo="Mi equipo"
        subtitulo="Aprueba los objetivos individuales de tus colaboradores, registra su seguimiento dentro de cada franja y pon su % de cumplimiento al final."
      />

      <LineaDeTiempoPeriodo franjas={franjas} periodo={datos.periodo.nombre} />

      {porAprobar.length > 0 && (
        <Callout tono="aviso" titulo={`${pluralizar(porAprobar.length, "objetivo espera", "objetivos esperan")} tu aprobación`}>
          Elige a la persona en la lista y revisa su propuesta: puedes aprobarla o devolverla con un comentario.
        </Callout>
      )}
      {enCurso && sinRegistroEnCurso.length > 0 && (
        <Callout
          tono="aviso"
          titulo={`Registra el seguimiento ${enCurso.numero}: faltan ${pluralizar(sinRegistroEnCurso.length, "objetivo", "objetivos")}`}
        >
          Tienes hasta el {formatearFecha(enCurso.fechaFin)}.
        </Callout>
      )}
      {franjas.cumplimiento?.estado === "EN_CURSO" && (
        <Callout tono="info" titulo="Ya puedes poner el % de cumplimiento">
          Hazlo en cada objetivo aprobado hasta el {formatearFecha(franjas.cumplimiento.fin)}.
        </Callout>
      )}

      {colaboradores.length === 0 ? (
        <EstadoVacio titulo="No tienes colaboradores a cargo">
          Gestión Humana asigna a cada persona su jefe directo desde Estructura organizacional.
        </EstadoVacio>
      ) : (
        <EquipoFiltrable colaboradores={colaboradores} franja={aFranjaUI(franjas)} />
      )}
    </>
  );
}
