import { FranjaBanner } from "@/components/FranjaBanner";
import { AgregarIndicador } from "@/components/AgregarIndicador";
import { TarjetaResumen } from "@/components/indicador-ui";
import { requireRol } from "@/server/auth/rbac";
import { obtenerMiGerencia } from "@/server/services/gerencia.service";
import { accionCrearIndicadorGerencia } from "./actions";
import { ColaboradorConsolidadoRow, IndicadorGerenciaCard } from "./components";

export default async function MiGerenciaPage() {
  const gerente = await requireRol("GERENTE");
  const datos = await obtenerMiGerencia(gerente.usuarioId);

  if (!datos) {
    return (
      <div className="rounded-card bg-iib-surface p-6 text-center shadow-card">
        <p className="text-sm text-iib-secondary">
          No hay un periodo abierto, o tu usuario no está asignado como gerente de ninguna
          gerencia.
        </p>
      </div>
    );
  }

  const { indicadores, tope, franjas } = datos;
  const cumplen = indicadores.filter((i) => i.estado === "CUMPLE").length;
  const noCumplen = indicadores.filter((i) => i.estado === "NO_CUMPLE").length;
  const enSeguimiento = indicadores.length - cumplen - noCumplen;
  const faltanPorCargar = Math.max(0, tope - indicadores.length);

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-iib-foreground">Mi gerencia</h1>
        <p className="text-sm text-iib-secondary">
          <strong className="font-semibold text-iib-foreground">{datos.gerencia.nombre}</strong> ·
          Periodo <strong className="font-semibold text-iib-foreground">{datos.periodo.nombre}</strong>
        </p>
        <FranjaBanner periodo={datos.periodo.nombre} franjas={datos.franjas} />
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Resumen de indicadores">
        <TarjetaResumen etiqueta="Indicadores" valor={`${indicadores.length} de ${tope}`} />
        <TarjetaResumen etiqueta="Cumplen" valor={cumplen} />
        <TarjetaResumen etiqueta="No cumplen" valor={noCumplen} />
        <TarjetaResumen etiqueta="En seguimiento" valor={enSeguimiento} destacada />
      </section>

      {faltanPorCargar > 0 && (
        <div className="rounded-md border-l-4 border-warning bg-warning-bg px-4 py-3 text-sm text-warning">
          <p className="font-semibold">
            Faltan {faltanPorCargar} indicador{faltanPorCargar === 1 ? "" : "es"} de la gerencia por cargar
          </p>
          <p className="mt-0.5 text-warning/90">Deben ser {tope}; el periodo no se puede cerrar con menos.</p>
        </div>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-iib-border pb-2.5">
          <h2 className="text-base font-bold">Componente 2 (C2): Metas por gerencia</h2>
          <span className="text-sm text-iib-secondary">
            Sin peso · en cada seguimiento registras su avance y al final marcas Cumple o No cumple
          </span>
        </div>

        {indicadores.length === 0 ? (
          <p className="text-sm text-iib-secondary">
            Todavía no hay indicadores. Agrega los {tope} para empezar el seguimiento.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {indicadores.map((indicador) => (
              <IndicadorGerenciaCard key={indicador.id} indicador={indicador} franjas={franjas} />
            ))}
          </div>
        )}

        {faltanPorCargar > 0 && <AgregarIndicador accion={accionCrearIndicadorGerencia} />}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-iib-border pb-2.5">
          <h2 className="text-base font-bold">Consolidado del equipo</h2>
          <span className="text-sm text-iib-secondary">
            {datos.colaboradores.length} colaborador{datos.colaboradores.length === 1 ? "" : "es"}
          </span>
        </div>

        {datos.colaboradores.length === 0 ? (
          <p className="text-sm text-iib-secondary">No hay colaboradores en esta gerencia.</p>
        ) : (
          <div className="overflow-hidden rounded-card bg-iib-surface shadow-card">
            {datos.colaboradores.map((colaborador) => (
              <ColaboradorConsolidadoRow key={colaborador.usuarioId} colaborador={colaborador} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
