import Link from "next/link";
import { requireRol } from "@/server/auth/rbac";
import { listarPeriodos } from "@/server/services/periodos.service";
import { PeriodoRow } from "./components";
import { CrearPeriodoForm } from "./CrearPeriodoForm";

export default async function AdministracionPage() {
  await requireRol("GESTION_HUMANA", "ADMIN");

  const periodos = await listarPeriodos();

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-iib-foreground">Administración</h1>
          <p className="text-sm text-iib-secondary">
            Periodos de evaluación, con la franja de cada seguimiento y la del % de cumplimiento. Los indicadores de
            la empresa se gestionan en la pestaña Indicadores.
          </p>
        </div>
        <Link
          href="/administracion/estructura"
          className="rounded-md border border-iib-border bg-iib-surface px-4 py-2 text-sm font-semibold text-iib-foreground shadow-card transition hover:bg-iib-surface-sunken"
        >
          Estructura organizacional →
        </Link>
      </div>

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
    </>
  );
}
