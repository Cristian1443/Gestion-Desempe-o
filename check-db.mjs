import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

// Ver todos los periodos con sus fechas
const periodos = await db.periodo.findMany({
  include: { seguimientos: { orderBy: { numero: 'asc' } } },
  orderBy: { fechaInicio: 'desc' }
});
console.log('=== PERIODOS ===');
for (const p of periodos) {
  console.log(`ID: ${p.id}`);
  console.log(`  Nombre: ${p.nombre}, Estado: ${p.estado}`);
  console.log(`  Inicio: ${p.fechaInicio?.toISOString()}, Fin: ${p.fechaFin?.toISOString()}`);
  console.log(`  Seguimientos: ${p.seguimientos.length}`);
}

// Ver objetivos por periodo
const objPorPeriodo = await db.objetivo.groupBy({
  by: ['periodoId', 'nivel'],
  _count: { id: true }
});
console.log('\n=== OBJETIVOS POR PERIODO ===');
for (const o of objPorPeriodo) {
  console.log(`  PeriodoId: ${o.periodoId}, Nivel: ${o.nivel}, Count: ${o._count.id}`);
}

// Simular obtenerPeriodoActual
const periodoActual = await db.periodo.findFirst({
  where: { estado: { in: ['ABIERTO', 'EN_EVALUACION'] } },
  orderBy: { fechaInicio: 'desc' }
});
console.log('\n=== PERIODO ACTUAL (el que usa la app) ===');
console.log(periodoActual?.nombre, periodoActual?.estado, periodoActual?.id);

await db.$disconnect();
