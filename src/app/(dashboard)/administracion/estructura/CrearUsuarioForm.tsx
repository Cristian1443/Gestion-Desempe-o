"use client";

import { useState, useTransition } from "react";
import { accionCrearUsuario } from "./actions";

const ROLES = [
  { valor: "COLABORADOR", etiqueta: "Colaborador" },
  { valor: "JEFE", etiqueta: "Jefe" },
  { valor: "GERENTE", etiqueta: "Gerente" },
  { valor: "GESTOR_CORPORATIVO", etiqueta: "Gestor de objetivos corporativos" },
  { valor: "GESTION_HUMANA", etiqueta: "Gestión Humana" },
  { valor: "ADMIN", etiqueta: "Admin" },
] as const;

export function CrearUsuarioForm({
  gerencias,
  usuarios,
}: {
  gerencias: Array<{ id: string; nombre: string }>;
  usuarios: Array<{ id: string; nombre: string }>;
}) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [cargo, setCargo] = useState("");
  const [gerenciaId, setGerenciaId] = useState("");
  const [jefeId, setJefeId] = useState("");
  const [roles, setRoles] = useState<string[]>(["COLABORADOR"]);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function alternarRol(rol: string) {
    setRoles((prev) => (prev.includes(rol) ? prev.filter((r) => r !== rol) : [...prev, rol]));
  }

  function enviar() {
    setError(null);
    setExito(null);
    startTransition(async () => {
      const resultado = await accionCrearUsuario({ nombre, email, cargo, gerenciaId, jefeId, roles });
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setExito(`${nombre} quedó dado de alta. Se vinculará automáticamente en su primer login.`);
      setNombre("");
      setEmail("");
      setCargo("");
      setGerenciaId("");
      setJefeId("");
      setRoles(["COLABORADOR"]);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-card bg-iib-surface p-5 shadow-card">
      <p className="text-xs font-bold uppercase tracking-wide text-iib-secondary">
        Dar de alta un colaborador
      </p>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre completo"
          className="rounded-md border border-iib-border bg-iib-background px-2.5 py-2 text-sm"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Correo corporativo"
          className="rounded-md border border-iib-border bg-iib-background px-2.5 py-2 text-sm"
        />
        <input
          value={cargo}
          onChange={(e) => setCargo(e.target.value)}
          placeholder="Cargo"
          className="rounded-md border border-iib-border bg-iib-background px-2.5 py-2 text-sm"
        />
        <select
          value={gerenciaId}
          onChange={(e) => setGerenciaId(e.target.value)}
          className="rounded-md border border-iib-border bg-iib-background px-2.5 py-2 text-sm"
        >
          <option value="">Sin gerencia</option>
          {gerencias.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nombre}
            </option>
          ))}
        </select>
        <select
          value={jefeId}
          onChange={(e) => setJefeId(e.target.value)}
          className="rounded-md border border-iib-border bg-iib-background px-2.5 py-2 text-sm sm:col-span-2"
        >
          <option value="">Sin jefe directo</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-iib-secondary">Roles</p>
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

      {error && <p className="text-sm font-medium text-danger">{error}</p>}
      {exito && <p className="text-sm font-medium text-success">{exito}</p>}

      <button
        type="button"
        onClick={enviar}
        disabled={pending || !nombre.trim() || !email.trim()}
        className="self-end rounded-md bg-iib-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-iib-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Creando…" : "Dar de alta"}
      </button>
    </div>
  );
}
