import { EditarUsuarioDialog } from "./EditarUsuarioDialog";
import { AsignarGerenteForm } from "./AsignarGerenteForm";

const ETIQUETA_ROL: Record<string, string> = {
  COLABORADOR: "Colaborador",
  JEFE: "Jefe",
  GERENTE: "Gerente",
  GESTOR_CORPORATIVO: "Gestor de objetivos corporativos",
  GESTION_HUMANA: "Gestión Humana",
  ADMIN: "Admin",
};

export function GerenciaRow({
  gerencia,
  usuariosDisponibles,
}: {
  gerencia: {
    id: string;
    nombre: string;
    gerente: { id: string; nombre: string } | null;
    _count: { colaboradores: number };
  };
  usuariosDisponibles: Array<{ id: string; nombre: string }>;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-iib-border px-4 py-3.5 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{gerencia.nombre}</p>
          <p className="text-xs text-iib-secondary">
            {gerencia._count.colaboradores} colaborador{gerencia._count.colaboradores === 1 ? "" : "es"}
          </p>
        </div>
        <span className="text-xs text-iib-secondary">
          Gerente:{" "}
          <strong className="font-semibold text-iib-foreground">
            {gerencia.gerente?.nombre ?? "sin asignar"}
          </strong>
        </span>
      </div>
      <AsignarGerenteForm gerenciaId={gerencia.id} usuarios={usuariosDisponibles} />
    </div>
  );
}

export function UsuarioRow({
  usuario,
  gerencias,
  usuarios,
}: {
  usuario: {
    id: string;
    nombre: string;
    email: string;
    cargo: string | null;
    activo: boolean;
    entraObjectId: string | null;
    gerencia: { id: string; nombre: string } | null;
    jefe: { id: string; nombre: string } | null;
    roles: Array<{ rol: string }>;
  };
  gerencias: Array<{ id: string; nombre: string }>;
  usuarios: Array<{ id: string; nombre: string }>;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-iib-border px-4 py-3.5 last:border-b-0">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">{usuario.nombre}</p>
          {!usuario.activo && (
            <span className="rounded-full bg-iib-surface-sunken px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-iib-secondary">
              Inactivo
            </span>
          )}
          {!usuario.entraObjectId && (
            <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-warning">
              Pendiente de primer login
            </span>
          )}
        </div>
        <p className="text-xs text-iib-secondary">
          {usuario.email}
          {usuario.cargo ? ` · ${usuario.cargo}` : ""}
        </p>
        <p className="text-xs text-iib-secondary">
          Gerencia: <strong className="font-medium text-iib-foreground">{usuario.gerencia?.nombre ?? "—"}</strong>
          {" · "}
          Jefe: <strong className="font-medium text-iib-foreground">{usuario.jefe?.nombre ?? "—"}</strong>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {usuario.roles.map((r) => (
            <span
              key={r.rol}
              className="rounded-full bg-iib-surface-sunken px-2 py-0.5 text-[0.65rem] font-semibold text-iib-secondary"
            >
              {ETIQUETA_ROL[r.rol] ?? r.rol}
            </span>
          ))}
        </div>
      </div>
      <EditarUsuarioDialog
        usuario={{
          id: usuario.id,
          nombre: usuario.nombre,
          cargo: usuario.cargo,
          gerenciaId: usuario.gerencia?.id ?? null,
          jefeId: usuario.jefe?.id ?? null,
          activo: usuario.activo,
          roles: usuario.roles.map((r) => r.rol),
        }}
        gerencias={gerencias}
        usuarios={usuarios}
      />
    </div>
  );
}
