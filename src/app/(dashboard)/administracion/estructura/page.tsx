import Link from "next/link";
import { BotonLink } from "@/components/ui/Boton";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { PageHeader } from "@/components/ui/PageHeader";
import { Seccion } from "@/components/ui/Seccion";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { pluralizar } from "@/lib/pendientes";
import { requireRol } from "@/server/auth/rbac";
import { listarGerencias, listarUsuarios } from "@/server/services/organizacion.service";
import { GerenciaRow, UsuarioRow } from "./components";
import { CrearGerenciaForm } from "./CrearGerenciaForm";
import { CrearUsuarioForm } from "./CrearUsuarioForm";

export default async function EstructuraOrganizacionalPage({
  searchParams,
}: {
  searchParams: { inactivos?: string };
}) {
  await requireRol("GESTION_HUMANA", "ADMIN");

  const [gerencias, usuarios] = await Promise.all([listarGerencias(), listarUsuarios()]);
  const usuariosActivos = usuarios.filter((u) => u.activo);
  const cantidadInactivos = usuarios.length - usuariosActivos.length;
  // Los inactivos (quienes ya salieron del grupo de Entra ID) se ocultan por
  // defecto, pero se pueden ver para reactivar a alguien.
  const mostrarInactivos = searchParams.inactivos === "1";
  const usuariosVisibles = mostrarInactivos ? usuarios : usuariosActivos;

  return (
    <>
      <PageHeader
        titulo="Estructura organizacional"
        subtitulo="Gerencias, colaboradores, y la relación de cada uno con su jefe directo."
        acciones={
          <BotonLink href="/administracion" variante="secundario">
            ← Volver a Administración
          </BotonLink>
        }
      />

      <Seccion titulo="Gerencias" contador={pluralizar(gerencias.length, "gerencia", "gerencias")}>
        <CrearGerenciaForm />

        {gerencias.length === 0 ? (
          <EstadoVacio titulo="Todavía no hay gerencias">Crea la primera arriba para asignarle su gerente.</EstadoVacio>
        ) : (
          <Tarjeta relleno="ninguno" className="overflow-hidden">
            {gerencias.map((gerencia) => (
              <GerenciaRow key={gerencia.id} gerencia={gerencia} usuariosDisponibles={usuariosActivos} />
            ))}
          </Tarjeta>
        )}
      </Seccion>

      <Seccion
        titulo="Colaboradores"
        contador={
          <>
            {pluralizar(usuariosVisibles.length, "usuario", "usuarios")}
            {cantidadInactivos > 0 && (
              <>
                {" · "}
                <Link
                  href={mostrarInactivos ? "/administracion/estructura" : "/administracion/estructura?inactivos=1"}
                  className="font-semibold text-iib-primary underline"
                >
                  {mostrarInactivos
                    ? "Ocultar inactivos"
                    : `Mostrar ${pluralizar(cantidadInactivos, "inactivo", "inactivos")}`}
                </Link>
              </>
            )}
          </>
        }
      >
        <CrearUsuarioForm gerencias={gerencias} usuarios={usuariosActivos} />

        <Tarjeta relleno="ninguno" className="overflow-hidden">
          {usuariosVisibles.map((usuario) => (
            <UsuarioRow
              key={usuario.id}
              usuario={usuario}
              gerencias={gerencias}
              usuarios={usuariosActivos}
            />
          ))}
        </Tarjeta>
      </Seccion>
    </>
  );
}
