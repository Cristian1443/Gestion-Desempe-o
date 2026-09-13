import Link from "next/link";
import { requireRol } from "@/server/auth/rbac";
import { obtenerObjetivosCorporativosAdmin } from "@/server/services/corporativos.service";
import { listarPeriodos } from "@/server/services/periodos.service";
import { ObjetivoCorporativoCard, PeriodoRow } from "./components";
import { CrearObjetivosCorporativosForm } from "./CrearObjetivosCorporativosForm";
import { CrearPeriodoForm } from "./CrearPeriodoForm";

export default async function AdministracionPage() {
  const usuario = await requireRol("GESTION_HUMANA", "ADMIN", "GESTOR_CORPORATIVO");
  const esAdmin = usuario.roles.includes("GESTION_HUMANA") || usuario.roles.includes("ADMIN");

  const [corporativos, periodos] = await Promise.all([
    obtenerObjetivosCorporativosAdmin(),
    esAdmin ? listarPeriodos() : Promise.resolve([]),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-iib-foreground">
            {esAdmin ? "Administración" : "Objetivos corporativos"}
          </h1>
          <p className="text-sm text-iib-secondary">
            {esAdmin
              ? "Objetivos corporativos y gestión de periodos de evaluación."
              : "Registra el avance de los 8 objetivos corporativos en cada corte."}
          </p>
        </div>
        {esAdmin && (
          <Link
            href="/administracion/estructura"
            className="rounded-md border border-iib-border bg-iib-surface px-4 py-2 text-sm font-semibold text-iib-foreground shadow-card transition hover:bg-iib-surface-sunken"
          >
            Estructura organizacional →
          </Link>
        )}
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-iib-border pb-2.5">
          <h2 className="text-base font-bold">Objetivos corporativos</h2>
          <span className="text-sm text-iib-secondary">8 objetivos · 3.75% cada uno</span>
        </div>

        {!corporativos ? (
          <p className="text-sm text-iib-secondary">No hay un periodo abierto en este momento.</p>
        ) : corporativos.objetivos.length === 0 ? (
          <CrearObjetivosCorporativosForm />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {corporativos.objetivos.map((objetivo, indice) => (
              <ObjetivoCorporativoCard
                key={objetivo.id}
                objetivo={objetivo}
                numero={indice + 1}
                numeroCorteActual={corporativos.corteActual?.numero ?? null}
                periodoEstado={corporativos.periodo.estado}
                puedeCalificar={esAdmin}
              />
            ))}
          </div>
        )}
      </section>

      {esAdmin && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-iib-border pb-2.5">
            <h2 className="text-base font-bold">Periodos</h2>
            <span className="text-sm text-iib-secondary">
              {periodos.length} periodo{periodos.length === 1 ? "" : "s"}
            </span>
          </div>

          <CrearPeriodoForm />

          {periodos.length === 0 ? (
            <p className="text-sm text-iib-secondary">Todavía no se ha creado ningún periodo.</p>
          ) : (
            <div className="overflow-hidden rounded-card bg-iib-surface shadow-card">
              {periodos.map((periodo) => (
                <PeriodoRow key={periodo.id} periodo={periodo} />
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
