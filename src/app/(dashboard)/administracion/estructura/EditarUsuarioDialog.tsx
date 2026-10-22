"use client";

import { useRef, useState, useTransition } from "react";
import { accionActualizarUsuario } from "./actions";

const ROLES = [
  { valor: "COLABORADOR", etiqueta: "Colaborador" },
  { valor: "JEFE", etiqueta: "Jefe" },
  { valor: "GERENTE", etiqueta: "Gerente" },
  { valor: "GESTOR_CORPORATIVO", etiqueta: "Gestor de objetivos corporativos" },
  { valor: "GESTION_HUMANA", etiqueta: "Gestión Humana" },
  { valor: "ADMIN", etiqueta: "Admin" },
] as const;

export function EditarUsuarioDialog({
  usuario,
  gerencias,
  usuarios,
}: {
  usuario: {
    id: string;
    nombre: string;
    cargo: string | null;
    gerenciaId: string | null;
    jefeId: string | null;
    activo: boolean;
    roles: string[];
  };
  gerencias: Array<{ id: string; nombre: string }>;
  usuarios: Array<{ id: string; nombre: string }>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [cargo, setCargo] = useState(usuario.cargo ?? "");
  const [gerenciaId, setGerenciaId] = useState(usuario.gerenciaId ?? "");
  const [jefeId, setJefeId] = useState(usuario.jefeId ?? "");
  const [roles, setRoles] = useState<string[]>(usuario.roles);
  const [activo, setActivo] = useState(usuario.activo);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const otrosUsuarios = usuarios.filter((u) => u.id !== usuario.id);

  // El diálogo no se desmonta al cerrarse (el <dialog> sigue en el DOM), así
  // que sin esto, cancelar una edición y volver a abrir el diálogo mostraría
  // los cambios abandonados de la vez anterior en vez del estado real.
  function abrirConEstadoActual() {
    setError(null);
    setCargo(usuario.cargo ?? "");
    setGerenciaId(usuario.gerenciaId ?? "");
    setJefeId(usuario.jefeId ?? "");
    setRoles(usuario.roles);
    setActivo(usuario.activo);
    dialogRef.current?.showModal();
  }

  function alternarRol(rol: string) {
    setRoles((prev) => (prev.includes(rol) ? prev.filter((r) => r !== rol) : [...prev, rol]));
  }

  function guardar() {
    setError(null);
    startTransition(async () => {
      const resultado = await accionActualizarUsuario({
        usuarioId: usuario.id,
        cargo,
        gerenciaId,
        jefeId,
        roles,
        activo,
      });
      if (!resultado.ok) {
        setError(resultado.error);
      } else {
        dialogRef.current?.close();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={abrirConEstadoActual}
        className="rounded-md border border-iib-border px-3 py-1.5 text-xs font-medium transition hover:bg-iib-surface-sunken"
      >
        Editar
      </button>

      <dialog
        ref={dialogRef}
        className="w-[calc(100%-2rem)] max-w-md rounded-card bg-iib-surface p-0 text-iib-foreground shadow-card backdrop:bg-black/45"
      >
        <div className="flex flex-col gap-3.5 p-6">
          <h3 className="text-base font-semibold">{usuario.nombre}</h3>

          <label className="flex flex-col gap-1 text-sm text-iib-secondary">
            Cargo
            <input
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              className="rounded-md border border-iib-border bg-iib-background px-2.5 py-2 text-sm text-iib-foreground"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-iib-secondary">
            Gerencia
            <select
              value={gerenciaId}
              onChange={(e) => setGerenciaId(e.target.value)}
              className="rounded-md border border-iib-border bg-iib-background px-2.5 py-2 text-sm text-iib-foreground"
            >
              <option value="">Sin gerencia</option>
              {gerencias.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-iib-secondary">
            Jefe directo
            <select
              value={jefeId}
              onChange={(e) => setJefeId(e.target.value)}
              className="rounded-md border border-iib-border bg-iib-background px-2.5 py-2 text-sm text-iib-foreground"
            >
              <option value="">Sin jefe directo</option>
              {otrosUsuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-1.5">
            <p className="text-sm text-iib-secondary">Roles</p>
            <div className="flex flex-wrap gap-3">
              {ROLES.map((rol) => (
                <label key={rol.valor} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={roles.includes(rol.valor)}
                    onChange={() => alternarRol(rol.valor)}
                  />
                  {rol.etiqueta}
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
            Activo
          </label>

          {error && <p className="text-sm font-medium text-danger">{error}</p>}

          <div className="mt-1 flex justify-end gap-2.5">
            <button
              type="button"
              className="rounded-md border border-iib-border px-3.5 py-2 text-sm font-medium transition hover:bg-iib-surface-sunken"
              onClick={() => dialogRef.current?.close()}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={guardar}
              disabled={pending}
              className="rounded-md bg-iib-primary px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-iib-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
