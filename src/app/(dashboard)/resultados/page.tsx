import { Callout } from "@/components/ui/Callout";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { PageHeader } from "@/components/ui/PageHeader";
import { Seccion } from "@/components/ui/Seccion";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { formatearFecha } from "@/lib/fecha";
import { pluralizar } from "@/lib/pendientes";
import { requireRol } from "@/server/auth/rbac";
import { obtenerResultados } from "@/server/services/resultados.service";
import { FilaGerencia, FilaObjetivoSinSeguimiento, TarjetaKpi } from "./components";

export default async function ResultadosPage() {
  await requireRol("GESTION_HUMANA", "ADMIN");

  const datos = await obtenerResultados();

  if (!datos) {
    return (
      <>
        <PageHeader titulo="Tablero de resultados" />
        <EstadoVacio titulo="No hay un periodo abierto" accion={{ href: "/administracion", etiqueta: "Ir a Administración" }}>
          Cuando haya un periodo abierto verás aquí quién ya hizo su seguimiento.
        </EstadoVacio>
      </>
    );
  }

  const referencia = datos.seguimientoReferencia;

  return (
    <>
      <PageHeader
        titulo="Tablero de resultados"
        subtitulo={
          <>
            Periodo <strong className="font-semibold text-iib-foreground">{datos.periodo.nombre}</strong>
            {referencia && (
              <>
                {" "}
                · Seguimiento <strong className="font-semibold text-iib-foreground">{referencia.numero}</strong> (
                {referencia.enCurso ? "en curso" : "último"}, del {formatearFecha(referencia.fechaInicio)} al{" "}
                {formatearFecha(referencia.fechaFin)})
              </>
            )}
            {" "}
            · cobertura de seguimiento del periodo.
          </>
        }
      />

      <Callout tono="info" titulo="Qué miden estas cifras">
        Cuántos objetivos ya tienen un registro en el seguimiento indicado arriba. No es el % de cumplimiento: ese es un
        juicio del evaluador que se pone una sola vez, al final, dentro de su franja.
      </Callout>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Cobertura por nivel">
        <TarjetaKpi etiqueta="Con seguimiento — Individual" cobertura={datos.coberturaIndividual} />
        <TarjetaKpi etiqueta="Con seguimiento — Gerencia" cobertura={datos.coberturaGerencia} />
        <TarjetaKpi etiqueta="Indicadores con avance del mes" cobertura={datos.coberturaCorporativo} />
        <Tarjeta className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-iib-secondary">Colaboradores con objetivos</p>
          <p className="text-3xl font-bold tabular-nums text-iib-foreground">
            {datos.totalColaboradoresConObjetivos}
            <span className="text-lg text-iib-secondary">/{datos.totalColaboradores}</span>
          </p>
          <p className="text-sm text-iib-secondary">han propuesto sus objetivos</p>
        </Tarjeta>
      </section>

      <Seccion titulo="Cobertura por gerencia" contador={pluralizar(datos.porGerencia.length, "gerencia", "gerencias")}>
        {datos.porGerencia.length === 0 ? (
          <EstadoVacio titulo="No hay gerencias creadas" accion={{ href: "/administracion/estructura", etiqueta: "Crear gerencias" }}>
            Se crean en Estructura organizacional.
          </EstadoVacio>
        ) : (
          <Tarjeta relleno="ninguno" className="overflow-hidden">
            {datos.porGerencia.map((gerencia) => (
              <FilaGerencia key={gerencia.gerenciaId} gerencia={gerencia} />
            ))}
          </Tarjeta>
        )}
      </Seccion>

      <Seccion
        titulo="Objetivos e indicadores sin registro"
        contador={pluralizar(datos.objetivosSinSeguimiento.length, "objetivo", "objetivos")}
      >
        {datos.objetivosSinSeguimiento.length === 0 ? (
          <EstadoVacio titulo="Todo al día">Todos los objetivos y los indicadores tienen su registro.</EstadoVacio>
        ) : (
          <Tarjeta relleno="ninguno" className="overflow-hidden">
            {datos.objetivosSinSeguimiento.map((objetivo) => (
              <FilaObjetivoSinSeguimiento key={objetivo.id} objetivo={objetivo} />
            ))}
          </Tarjeta>
        )}
      </Seccion>
    </>
  );
}
