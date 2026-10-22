import { FranjaBanner } from "@/components/FranjaBanner";
import { aFranjaUI } from "@/lib/franja-ui";
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
          Aprueba los objetivos individuales de tus colaboradores, registra su seguimiento dentro de cada franja y
          marca si cumple o no cumple al final.
        </p>
        <FranjaBanner periodo={datos.periodo.nombre} franjas={datos.franjas} />
      </div>

      {datos.colaboradores.length === 0 ? (
        <p className="text-sm text-iib-secondary">No tienes colaboradores a cargo.</p>
      ) : (
        <EquipoFiltrable
          colaboradores={datos.colaboradores}
          franja={aFranjaUI(datos.franjas)}
          jefe={datos.jefe}
        />
      )}
    </>
  );
}
