import { requireRol } from "@/server/auth/rbac";
import { listarGerencias, listarUsuarios } from "@/server/services/organizacion.service";
import { GerenciaRow, UsuarioRow } from "./components";
import { CrearGerenciaForm } from "./CrearGerenciaForm";
import { CrearUsuarioForm } from "./CrearUsuarioForm";

export default async function EstructuraOrganizacionalPage() {
  await requireRol("GESTION_HUMANA", "ADMIN");

  const [gerencias, usuarios] = await Promise.all([listarGerencias(), listarUsuarios()]);
  const usuariosActivos = usuarios.filter((u) => u.activo);

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-iib-foreground">Estructura organizacional</h1>
        <p className="text-sm text-iib-secondary">
          Gerencias, colaboradores, y la relación de cada uno con su jefe directo.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-iib-border pb-2.5">
          <h2 className="text-base font-bold">Gerencias</h2>
          <span className="text-sm text-iib-secondary">
            {gerencias.length} gerencia{gerencias.length === 1 ? "" : "s"}
          </span>
        </div>

        <CrearGerenciaForm />

        {gerencias.length === 0 ? (
          <p className="text-sm text-iib-secondary">No hay gerencias creadas todavía.</p>
        ) : (
          <div className="overflow-hidden rounded-card bg-iib-surface shadow-card">
            {gerencias.map((gerencia) => (
              <GerenciaRow key={gerencia.id} gerencia={gerencia} usuariosDisponibles={usuariosActivos} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-iib-border pb-2.5">
          <h2 className="text-base font-bold">Colaboradores</h2>
          <span className="text-sm text-iib-secondary">
            {usuarios.length} usuario{usuarios.length === 1 ? "" : "s"}
          </span>
        </div>

        <CrearUsuarioForm gerencias={gerencias} usuarios={usuariosActivos} />

        <div className="overflow-hidden rounded-card bg-iib-surface shadow-card">
          {usuarios.map((usuario) => (
            <UsuarioRow
              key={usuario.id}
              usuario={usuario}
              gerencias={gerencias}
              usuarios={usuariosActivos}
            />
          ))}
        </div>
      </section>
    </>
  );
}
