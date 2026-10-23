// Datos mínimos para poder arrancar el sistema en un ambiente nuevo:
// periodo, seguimientos con franja, y una cuenta de
// arranque con permisos de administrador. Ya NO inventa personas ni
// gerencias — eso lo trae la migración real
// (scripts/migracion-sharepoint/importar-estructura-real.mjs) contra el
// directorio real de Entra ID. Es idempotente: correrlo varias veces no
// duplica nada.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  // Cuenta de arranque: sin ella, nadie podría entrar a Administración ni a
  // Estructura organizacional para correr la migración real la primera vez.
  // Igual que cualquier colaborador real, queda "pendiente" (sin
  // entraObjectId) y se vincula sola en su primer login por SSO.
  const admin = await db.usuario.upsert({
    where: { email: "iibservices2@investinbogota.org" },
    update: { activo: true },
    create: {
      email: "iibservices2@investinbogota.org",
      nombre: "IIB Services",
      cargo: "Administrador del sistema",
      activo: true,
    },
  });
  await db.usuarioRol.deleteMany({ where: { usuarioId: admin.id } });
  await db.usuarioRol.createMany({
    data: [
      { usuarioId: admin.id, rol: "GESTION_HUMANA" },
      { usuarioId: admin.id, rol: "ADMIN" },
    ],
  });

  // El periodo es anual (no semestral): cubre el año calendario completo.
  // `update` va con los mismos valores que `create` (no `{}`): así, si una
  // prueba manual dejó el periodo en otro estado, volver a correr el seed lo
  // restaura de verdad en vez de dejarlo como esté.
  // La franja del % de cumplimiento es de ejemplo: termina después del periodo
  // porque la evaluación se hace al cierre del año.
  const datosPeriodo = {
    fechaInicio: new Date("2026-01-01"),
    fechaFin: new Date("2026-12-31"),
    estado: "ABIERTO" as const,
    cumplimientoInicio: new Date("2027-01-05"),
    cumplimientoFin: new Date("2027-01-25"),
  };
  const periodo = await db.periodo.upsert({
    where: { nombre: "2026" },
    update: datosPeriodo,
    create: { nombre: "2026", ...datosPeriodo },
  });

  // Seguimientos trimestrales de partida, con una franja de dos semanas al
  // final de cada trimestre — Talento Humano los reprograma desde
  // Administración según el calendario real del año.
  const franjasSeguimiento = [
    { numero: 1, fechaInicio: new Date("2026-03-16"), fechaFin: new Date("2026-03-31") },
    { numero: 2, fechaInicio: new Date("2026-06-16"), fechaFin: new Date("2026-06-30") },
    { numero: 3, fechaInicio: new Date("2026-09-16"), fechaFin: new Date("2026-09-30") },
    { numero: 4, fechaInicio: new Date("2026-12-16"), fechaFin: new Date("2026-12-31") },
  ];
  const seguimientos = [];
  for (const datos of franjasSeguimiento) {
    seguimientos.push(
      await db.seguimiento.upsert({
        where: { periodoId_numero: { periodoId: periodo.id, numero: datos.numero } },
        update: { fechaInicio: datos.fechaInicio, fechaFin: datos.fechaFin },
        create: { ...datos, periodoId: periodo.id },
      }),
    );
  }

  console.log("Seed completado:");
  console.log(`  Cuenta de arranque: ${admin.email} (Talento Humano + Admin, pendiente de primer login)`);
  console.log(`  Periodo: ${periodo.nombre} (${seguimientos.length} seguimientos con franja)`);
  console.log("  Indicadores de la empresa: ninguno (los carga el Gestor corporativo desde la pestaña Indicadores)");
  console.log(
    "\n  Para cargar la estructura organizacional y los objetivos reales, corre:",
  );
  console.log(
    "  node --env-file=.env.local scripts/migracion-sharepoint/importar-estructura-real.mjs <archivo.xlsx>",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
