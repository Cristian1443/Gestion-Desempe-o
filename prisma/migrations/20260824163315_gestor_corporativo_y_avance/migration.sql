-- AlterEnum
ALTER TYPE "Rol" ADD VALUE 'GESTOR_CORPORATIVO';

-- AlterTable
ALTER TABLE "seguimientos" ADD COLUMN     "porcentaje_avance" INTEGER;
