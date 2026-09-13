-- CreateEnum
CREATE TYPE "EstadoCorte" AS ENUM ('BORRADOR', 'ABIERTO', 'CERRADO');

-- AlterTable
ALTER TABLE "cortes" ADD COLUMN     "estado" "EstadoCorte" NOT NULL DEFAULT 'BORRADOR';
