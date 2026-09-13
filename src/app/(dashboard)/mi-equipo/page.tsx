import { requireRol } from "@/server/auth/rbac";
import { obtenerMiEquipo } from "@/server/services/equipo.service";
import { EquipoFiltrable } from "./EquipoFiltrable";

export default async function MiEquipoPage() {
  const jefe = await requireRol("JEFE");
  const datos = await obtenerMiEquipo(jefe.usuarioId);

  if (!datos) {
    return (
      <div className="rounded-card bg-iib-surface p-6 text-center shadow-card">
        <p className="text-sm text-iib-secondary">
          No hay un periodo de evaluación abierto en este momento.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-iib-foreground">Mi equipo</h1>
        <p className="text-sm text-iib-secondary">
          Periodo <strong className="font-semibold text-iib-foreground">{datos.periodo.nombre}</strong>
          {datos.corteActual && (
            <>
              {" "}
              · Corte <strong className="font-semibold text-iib-foreground">{datos.corteActual.numero}</strong>
            </>
          )}{" "}
          ·{" "}
          {datos.periodo.estado === "EN_EVALUACION"
            ? "todos los cortes están cerrados: registra la calificación final de cada colaborador."
            : "aprueba los objetivos individuales de tus colaboradores y registra su seguimiento en cada corte."}
        </p>
      </div>

      {datos.colaboradores.length === 0 ? (
        <p className="text-sm text-iib-secondary">No tienes colaboradores a cargo.</p>
      ) : (
        <EquipoFiltrable
          colaboradores={datos.colaboradores}
          numeroCorteActual={datos.corteActual?.numero ?? null}
          periodoEstado={datos.periodo.estado}
          jefe={datos.jefe}
        />
      )}
    </>
  );
}
