import { BotonLink } from "@/components/ui/Boton";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { PageHeader } from "@/components/ui/PageHeader";
import { Seccion } from "@/components/ui/Seccion";
import { pluralizar } from "@/lib/pendientes";
import { requireRol } from "@/server/auth/rbac";
import { evaluarCierre, listarPeriodos } from "@/server/services/periodos.service";
import { PeriodoRow } from "./components";
import { CrearPeriodoForm } from "./CrearPeriodoForm";

export default async function AdministracionPage() {
  await requireRol("GESTION_HUMANA", "ADMIN");

  const periodos = await listarPeriodos();
  const abierto = periodos.find((p) => p.estado === "ABIERTO");
  const cierre = abierto ? await evaluarCierre(abierto.id) : null;

  return (
    <>
      <PageHeader
        titulo="Administración"
        subtitulo="Prepara el periodo en orden: seguimientos con su franja, franja del % final, abrir y, al terminar, cerrar. Los indicadores de la empresa se gestionan en la pestaña Indicadores."
        acciones={
          <BotonLink href="/administracion/estructura" variante="secundario">
            Estructura organizacional →
          </BotonLink>
        }
      />

      <Seccion titulo="Periodos" contador={pluralizar(periodos.length, "periodo", "periodos")}>
        {periodos.length === 0 ? (
          <EstadoVacio titulo="Todavía no hay ningún periodo">Crea el primero abajo para empezar a configurarlo.</EstadoVacio>
        ) : (
          <div className="flex flex-col gap-5">
            {periodos.map((periodo) => (
              <PeriodoRow key={periodo.id} periodo={periodo} cierre={periodo.id === abierto?.id ? cierre : null} />
            ))}
          </div>
        )}

        <details className="group rounded-card border border-iib-border bg-iib-surface">
          <summary className="flex min-h-11 cursor-pointer list-none items-center px-5 text-sm font-semibold text-iib-primary [&::-webkit-details-marker]:hidden">
            + Crear un periodo nuevo
          </summary>
          <div className="border-t border-iib-border p-1">
            <CrearPeriodoForm />
          </div>
        </details>
      </Seccion>
    </>
  );
}
