import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

const PRUEBA_ID = 'cmt1w03380004jkedscpwavni';

// Eliminar cortes del periodo PRUEBA primero
const cortesEliminados = await db.corte.deleteMany({ where: { periodoId: PRUEBA_ID } });
console.log('Cortes eliminados:', cortesEliminados.count);

// Eliminar el periodo PRUEBA
const periodoEliminado = await db.periodo.delete({ where: { id: PRUEBA_ID } });
console.log('Periodo eliminado:', periodoEliminado.nombre);

// Verificar que el periodo 2026 queda como actual
const periodoActual = await db.periodo.findFirst({
  where: { estado: { in: ['ABIERTO', 'EN_EVALUACION'] } },
  orderBy: { fechaInicio: 'desc' }
});
console.log('\nPeriodo actual ahora:', periodoActual?.nombre, '-', periodoActual?.estado);

await db.$disconnect();
