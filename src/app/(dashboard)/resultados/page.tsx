import { requireRol } from "@/server/auth/rbac";
import { obtenerResultados } from "@/server/services/resultados.service";
import { FilaGerencia, FilaObjetivoSinSeguimiento, TarjetaKpi } from "./components";

export default async function ResultadosPage() {
  await requireRol("GESTION_HUMANA", "ADMIN");

  const datos = await obtenerResultados();

  if (!datos) {
    return (
      <div className="rounded-card bg-iib-surface p-6 text-center shadow-card">
        <p className="text-sm text-iib-secondary">No hay un periodo abierto en este momento.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-iib-foreground">Tablero de resultados</h1>
        <p className="text-sm text-iib-secondary">
          Periodo <strong className="font-semibold text-iib-foreground">{datos.periodo.nombre}</strong>
          {datos.corteActual && (
            <>
              {" "}
              · Corte <strong className="font-semibold text-iib-foreground">{datos.corteActual.numero}</strong>
            </>
          )}{" "}
          · cobertura de seguimiento del ciclo de evaluación en curso.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TarjetaKpi etiqueta="Con seguimiento — Individual" cobertura={datos.coberturaIndividual} />
          <TarjetaKpi etiqueta="Con seguimiento — Gerencia" cobertura={datos.coberturaGerencia} />
          <TarjetaKpi etiqueta="Con seguimiento — Corporativo" cobertura={datos.coberturaCorporativo} />
          <div className="flex flex-col gap-1.5 rounded-card bg-iib-surface p-5 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-iib-secondary">
              Colaboradores con objetivos
            </p>
            <p className="text-3xl font-bold tabular-nums text-iib-foreground">
              {datos.totalColaboradoresConObjetivos}
              <span className="text-lg text-iib-secondary">/{datos.totalColaboradores}</span>
            </p>
          </div>
        </div>
        <p className="rounded-card border border-dashed border-iib-border bg-iib-surface px-4 py-3 text-xs text-iib-secondary">
          Estas cifras muestran <strong>cuántos objetivos ya tienen un seguimiento registrado en el
          corte actual</strong>, no la calificación final del periodo — esa es un juicio del evaluador
          que se asigna al cierre, después de que existan los seguimientos de todos los cortes que
          definió el administrador.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-iib-border pb-2.5">
          <h2 className="text-base font-bold">Cobertura por gerencia</h2>
          <span className="text-sm text-iib-secondary">
            {datos.porGerencia.length} gerencia{datos.porGerencia.length === 1 ? "" : "s"}
          </span>
        </div>

        {datos.porGerencia.length === 0 ? (
          <p className="text-sm text-iib-secondary">No hay gerencias creadas todavía.</p>
        ) : (
          <div className="overflow-hidden rounded-card bg-iib-surface shadow-card">
            {datos.porGerencia.map((gerencia) => (
              <FilaGerencia key={gerencia.gerenciaId} gerencia={gerencia} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-iib-border pb-2.5">
          <h2 className="text-base font-bold">Objetivos sin seguimiento del corte actual</h2>
          <span className="text-sm text-iib-secondary">
            {datos.objetivosSinSeguimiento.length} objetivo
            {datos.objetivosSinSeguimiento.length === 1 ? "" : "s"}
          </span>
        </div>

        {datos.objetivosSinSeguimiento.length === 0 ? (
          <p className="text-sm text-iib-secondary">
            Todos los objetivos ya tienen seguimiento registrado en este corte.
          </p>
        ) : (
          <div className="overflow-hidden rounded-card bg-iib-surface shadow-card">
            {datos.objetivosSinSeguimiento.map((objetivo) => (
              <FilaObjetivoSinSeguimiento key={objetivo.id} objetivo={objetivo} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
