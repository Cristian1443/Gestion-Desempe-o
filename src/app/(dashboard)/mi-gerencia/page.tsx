import { FranjaBanner } from "@/components/FranjaBanner";
import { aFranjaUI } from "@/lib/franja-ui";
import { requireRol } from "@/server/auth/rbac";
import { obtenerMiGerencia } from "@/server/services/gerencia.service";
import { ColaboradorConsolidadoRow, ObjetivoGerenciaCard } from "./components";
import { CrearObjetivosGerenciaForm } from "./CrearObjetivosGerenciaForm";

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

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-iib-border pb-2.5">
          <h2 className="text-base font-bold">Objetivos de gerencia</h2>
          <span className="text-sm text-iib-secondary">2 objetivos · 15% cada uno</span>
        </div>

        {datos.objetivos.length === 0 ? (
          <CrearObjetivosGerenciaForm />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {datos.objetivos.map((objetivo, indice) => (
              <ObjetivoGerenciaCard
                key={objetivo.id}
                objetivo={objetivo}
                numero={indice + 1}
                franja={aFranjaUI(datos.franjas)}
              />
            ))}
          </div>
        )}
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
