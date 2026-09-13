// Datos mínimos para poder arrancar el sistema en un ambiente nuevo:
// periodo, cortes, objetivos corporativos de partida, y una cuenta de
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
  const datosPeriodo = {
    fechaInicio: new Date("2026-01-01"),
    fechaFin: new Date("2026-12-31"),
    estado: "ABIERTO" as const,
  };
  const periodo = await db.periodo.upsert({
    where: { nombre: "2026" },
    update: datosPeriodo,
    create: { nombre: "2026", ...datosPeriodo },
  });

  // Cortes trimestrales de partida — Gestión Humana los reprograma desde
  // Administración según el calendario real de seguimiento del año.
  const fechasCorte = [
    { numero: 1, nombre: "Corte 1", fechaLimite: new Date("2026-03-31") },
    { numero: 2, nombre: "Corte 2", fechaLimite: new Date("2026-06-30") },
    { numero: 3, nombre: "Corte 3", fechaLimite: new Date("2026-09-30") },
    { numero: 4, nombre: "Corte 4", fechaLimite: new Date("2026-12-31") },
  ];
  const cortes = [];
  for (const datos of fechasCorte) {
    cortes.push(
      await db.corte.upsert({
        where: { periodoId_numero: { periodoId: periodo.id, numero: datos.numero } },
        update: { nombre: datos.nombre, fechaLimite: datos.fechaLimite },
        create: { ...datos, periodoId: periodo.id },
      }),
    );
  }

  // --- Objetivos corporativos (30%, 8 x 3.75%) ---
  // Contenido de partida genérico — Gestión Humana los reemplaza por los
  // reales del periodo desde Administración cuando los tenga definidos.
  const existentes = await db.objetivo.count({ where: { periodoId: periodo.id, nivel: "CORPORATIVO" } });
  if (existentes === 0) {
    const objetivosCorporativos = [
      "Incrementar la inversión extranjera directa facilitada hacia Bogotá-Región.",
      "Fortalecer la percepción de Bogotá como destino de inversión en mercados prioritarios.",
      "Mejorar el índice de satisfacción de los inversionistas atendidos.",
      "Aumentar el compromiso y clima organizacional (eNPS).",
      "Fortalecer el gobierno de datos y la seguridad de la información.",
      "Optimizar la ejecución presupuestal de la Corporación.",
      "Fortalecer alianzas estratégicas con el sector público y privado.",
      "Avanzar en la estrategia de sostenibilidad y responsabilidad social corporativa.",
    ];

    for (const titulo of objetivosCorporativos) {
      await db.objetivo.create({
        data: {
          periodoId: periodo.id,
          nivel: "CORPORATIVO",
          titulo,
          descripcion: titulo,
          meta: "Por definir por Gestión Humana",
          indicador: "Por definir por Gestión Humana",
          unidadMedida: "%",
          peso: 3.75,
          estadoAprobacion: "APROBADO",
          creadoPor: admin.id,
        },
      });
    }
  }

  console.log("Seed completado:");
  console.log(`  Cuenta de arranque: ${admin.email} (Gestión Humana + Admin, pendiente de primer login)`);
  console.log(`  Periodo: ${periodo.nombre} (${cortes.length} cortes)`);
  console.log(
    "  Objetivos corporativos de partida: 8 (contenido genérico, editar desde Administración)",
  );
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
