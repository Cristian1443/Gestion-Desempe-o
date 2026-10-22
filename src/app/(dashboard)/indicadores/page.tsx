import { AgregarIndicador } from "@/components/AgregarIndicador";
import { TarjetaResumen } from "@/components/indicador-ui";
import { Callout } from "@/components/ui/Callout";
import { Chip } from "@/components/ui/Chip";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { PageHeader } from "@/components/ui/PageHeader";
import { Seccion } from "@/components/ui/Seccion";
import { formatearFecha } from "@/lib/fecha";
import { etiquetaMes } from "@/lib/mes";
import { pluralizar } from "@/lib/pendientes";
import { requireUsuarioAutenticado } from "@/server/auth/rbac";
import { obtenerIndicadores } from "@/server/services/indicadores.service";
import { accionCrearIndicador } from "./actions";
import { IndicadorCard } from "./components";

const ROLES_EDITORES = ["GESTOR_CORPORATIVO", "GESTION_HUMANA", "ADMIN"] as const;

export default async function IndicadoresPage() {
  const usuario = await requireUsuarioAutenticado();
  const puedeEditar = ROLES_EDITORES.some((rol) => usuario.roles.includes(rol));

  const datos = await obtenerIndicadores();

  if (!datos) {
    return (
      <>
        <PageHeader titulo="Indicadores de la empresa" />
        <EstadoVacio titulo="No hay un periodo de evaluación abierto">
          Cuando Gestión Humana abra el periodo, aquí verás los indicadores y su avance mes a mes.
        </EstadoVacio>
      </>
    );
  }

  const { indicadores, cumplimiento, mesActual, mesesRegistrables, meses, responsables, tope } = datos;
  const faltanPorCargar = Math.max(0, tope - indicadores.length);

  const cumplen = indicadores.filter((i) => i.estado === "CUMPLE").length;
  const noCumplen = indicadores.filter((i) => i.estado === "NO_CUMPLE").length;
  const enSeguimiento = indicadores.length - cumplen - noCumplen;

  const mesEsRegistrable = mesesRegistrables.includes(mesActual);
  const sinAvanceEsteMes = mesEsRegistrable
    ? indicadores.filter((i) => i.cumplido === null && !i.avances.some((a) => a.mes === mesActual))
    : [];

  const cumplimientoEnCurso = cumplimiento?.estado === "EN_CURSO";

  return (
    <>
      <PageHeader
        titulo="Indicadores de la empresa"
        subtitulo={`Son ${tope} para toda la Corporación. No llevan peso: cada mes se registra su avance acumulado con un comentario y al final se marca si cumple o no cumple.`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Chip tono="neutro" conSimbolo={false}>
            Periodo {datos.periodo.nombre}
          </Chip>
          <Chip tono="info">
            Mes en curso: <span className="capitalize">{etiquetaMes(mesActual)}</span>
          </Chip>
          <Chip tono="neutro" conSimbolo={false}>
            {responsables.length > 0
              ? `Responsable: ${responsables.join(", ")}`
              : "Sin responsable asignado (rol Gestor de objetivos corporativos)"}
          </Chip>
        </div>
      </PageHeader>

      {puedeEditar && faltanPorCargar > 0 && (
        <Callout
          tono="aviso"
          titulo={`Faltan ${pluralizar(faltanPorCargar, "indicador", "indicadores")} por cargar`}
        >
          Deben ser {tope}; el periodo no se puede cerrar con menos.
        </Callout>
      )}

      {puedeEditar && sinAvanceEsteMes.length > 0 && (
        <Callout
          tono="aviso"
          titulo={`Falta registrar el avance de ${etiquetaMes(mesActual)} en ${pluralizar(sinAvanceEsteMes.length, "indicador", "indicadores")}`}
        >
          {sinAvanceEsteMes
            .slice(0, 5)
            .map((i) => i.titulo)
            .join(" · ")}
          {sinAvanceEsteMes.length > 5 ? ` · y ${sinAvanceEsteMes.length - 5} más` : ""}
        </Callout>
      )}

      {cumplimiento ? (
        cumplimientoEnCurso ? (
          <Callout tono="info" titulo="Ya se puede marcar el resultado final">
            Marca Cumple o No cumple en cada indicador hasta el {formatearFecha(cumplimiento.fin)}.
          </Callout>
        ) : cumplimiento.estado === "PROXIMA" ? (
          <Callout tono="info" titulo="El resultado final se marca más adelante">
            Será del {formatearFecha(cumplimiento.inicio)} al {formatearFecha(cumplimiento.fin)}.
          </Callout>
        ) : (
          <Callout tono="aviso" titulo="La franja del resultado final ya terminó">
            Terminó el {formatearFecha(cumplimiento.fin)}.
          </Callout>
        )
      ) : (
        <Callout tono="aviso" titulo="Falta definir la franja del resultado final">
          Gestión Humana todavía no la definió; sin ella no se puede marcar Cumple o No cumple.
        </Callout>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Resumen de indicadores">
        <TarjetaResumen etiqueta="Indicadores" valor={`${indicadores.length} de ${tope}`} />
        <TarjetaResumen etiqueta="Cumplen" valor={cumplen} />
        <TarjetaResumen etiqueta="No cumplen" valor={noCumplen} />
        <TarjetaResumen etiqueta="En seguimiento" valor={enSeguimiento} destacada />
      </section>

      <Seccion
        titulo="Seguimiento mes a mes"
        descripcion={puedeEditar ? "Toca un mes para registrar o corregir su avance." : undefined}
      >
        {indicadores.length === 0 ? (
          <EstadoVacio titulo={puedeEditar ? "Todavía no hay indicadores" : "Todavía no se han cargado los indicadores"}>
            {puedeEditar
              ? `Agrega los ${tope} indicadores de la empresa para empezar el seguimiento.`
              : "Cuando se carguen, verás aquí su avance mes a mes."}
          </EstadoVacio>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {indicadores.map((indicador) => (
              <IndicadorCard
                key={indicador.id}
                indicador={indicador}
                meses={meses}
                mesActual={mesActual}
                mesesRegistrables={mesesRegistrables}
                puedeEditar={puedeEditar}
                cumplimientoEnCurso={cumplimientoEnCurso}
              />
            ))}
          </div>
        )}

        {puedeEditar && faltanPorCargar > 0 && <AgregarIndicador accion={accionCrearIndicador} />}
      </Seccion>
    </>
  );
}
