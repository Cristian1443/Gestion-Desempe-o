import { z } from "zod";

const ROLES_VALIDOS = [
  "COLABORADOR",
  "JEFE",
  "GERENTE",
  "GESTOR_CORPORATIVO",
  "GESTION_HUMANA",
  "ADMIN",
] as const;

export const crearGerenciaSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio.").max(150),
});

export const asignarGerenteSchema = z.object({
  gerenciaId: z.string().min(1),
  usuarioId: z.string().min(1, "Selecciona un usuario."),
});

export const crearUsuarioSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio.").max(200),
  email: z.string().email("Correo inválido.").max(200),
  cargo: z.string().max(150).optional().or(z.literal("")),
  gerenciaId: z.string().min(1).optional().or(z.literal("")),
  jefeId: z.string().min(1).optional().or(z.literal("")),
  roles: z.array(z.enum(ROLES_VALIDOS)).min(1, "Selecciona al menos un rol."),
});

export const actualizarUsuarioSchema = z.object({
  usuarioId: z.string().min(1),
  cargo: z.string().max(150).optional().or(z.literal("")),
  gerenciaId: z.string().min(1).optional().or(z.literal("")),
  jefeId: z.string().min(1).optional().or(z.literal("")),
  roles: z.array(z.enum(ROLES_VALIDOS)).min(1, "Selecciona al menos un rol."),
  activo: z.boolean(),
});
