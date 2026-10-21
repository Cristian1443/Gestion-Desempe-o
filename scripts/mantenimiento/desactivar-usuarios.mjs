// Desactiva (activo = false) a las personas listadas abajo, buscándolas por
// nombre. Es reversible: se pueden reactivar desde Estructura organizacional
// (Mostrar inactivos → Editar → Activo). Con la lista oculta por defecto en esa
// pantalla, dejan de aparecer apenas se desactivan.
//
// Por defecto es un ensayo (no escribe nada); agrega --aplicar para ejecutar.
//
// Aplica las mismas protecciones que actualizarUsuario en la app: no
// desactiva a quien sea gerente de una gerencia ni a quien tenga
// colaboradores activos a cargo (hay que reasignarlos primero), y nunca toca
// la cuenta de arranque del sistema.
//
// Importante: si la persona sigue habilitada en el grupo "Usuarios_activos" de
// Entra ID, sincronizar-grupo.mjs la vuelve a activar en su próxima corrida.
// Hay que sacarla del grupo (o deshabilitar su cuenta) en Entra ID también.
//
// Uso: node --env-file=.env scripts/mantenimiento/desactivar-usuarios.mjs [--aplicar]

import { PrismaClient } from "@prisma/client";

const NOMBRES = [
  "Daniel Felipe Navarro Soriano",
  "Estrella de los Ángeles Ortiz",
  "Francisco Simón Solano Olarte",
  "Holman Osiriz Ruiz Martínez",
  "IIB Services 2",
  "Johana Marcela Agudelo Valencia",
  "Luz Edith Fajardo Gómez",
  "Oscar Daniel Machado Vega",
];

const CORREOS_PROTEGIDOS = new Set(["iibservices2@investinbogota.org"]);

const aplicar = process.argv.includes("--aplicar");
const db = new PrismaClient();

const normalizar = (texto) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

async function main() {
  console.log(aplicar ? "MODO: APLICAR cambios\n" : "MODO: ensayo (no se escribe nada; usa --aplicar)\n");

  const usuarios = await db.usuario.findMany({
    select: { id: true, nombre: true, email: true, activo: true },
  });

  for (const nombre of NOMBRES) {
    const coincidencias = usuarios.filter((u) => normalizar(u.nombre) === normalizar(nombre));

    if (coincidencias.length === 0) {
      console.log(`- ${nombre}: no encontrado en esta base de datos.`);
      continue;
    }
    if (coincidencias.length > 1) {
      console.log(
        `- ${nombre}: ${coincidencias.length} coincidencias (${coincidencias
          .map((u) => u.email)
          .join(", ")}). Se omite; desactívalo a mano.`,
      );
      continue;
    }

    const usuario = coincidencias[0];

    if (CORREOS_PROTEGIDOS.has(usuario.email.toLowerCase())) {
      console.log(`- ${nombre} (${usuario.email}): cuenta de arranque del sistema, protegida. Se omite.`);
      continue;
    }
    if (!usuario.activo) {
      console.log(`- ${nombre} (${usuario.email}): ya estaba inactivo.`);
      continue;
    }

    const [gerencia, colaboradoresActivos] = await Promise.all([
      db.gerencia.findFirst({ where: { gerenteId: usuario.id } }),
      db.usuario.count({ where: { jefeId: usuario.id, activo: true } }),
    ]);
    if (gerencia) {
      console.log(`- ${nombre}: es gerente de "${gerencia.nombre}". Asigna otro gerente primero. Se omite.`);
      continue;
    }
    if (colaboradoresActivos > 0) {
      console.log(
        `- ${nombre}: tiene ${colaboradoresActivos} colaborador(es) activo(s) a cargo. Reasígnalos primero. Se omite.`,
      );
      continue;
    }

    if (aplicar) {
      await db.usuario.update({ where: { id: usuario.id }, data: { activo: false } });
      console.log(`- ${nombre} (${usuario.email}): DESACTIVADO.`);
    } else {
      console.log(`- ${nombre} (${usuario.email}): se desactivaría.`);
    }
  }
}

main()
  .catch((err) => {
    console.error("FALLÓ:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
