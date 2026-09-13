/*
  Warnings:

  - You are about to drop the column `comentario_validacion` on the `seguimientos` table. All the data in the column will be lost.
  - You are about to drop the column `estado` on the `seguimientos` table. All the data in the column will be lost.
  - You are about to drop the column `estado_validacion` on the `seguimientos` table. All the data in the column will be lost.
  - You are about to drop the column `evidencia_url` on the `seguimientos` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_validacion` on the `seguimientos` table. All the data in the column will be lost.
  - You are about to drop the column `porcentaje_avance` on the `seguimientos` table. All the data in the column will be lost.
  - You are about to drop the column `validado_por` on the `seguimientos` table. All the data in the column will be lost.
  - Made the column `comentario` on table `seguimientos` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "seguimientos" DROP CONSTRAINT "seguimientos_validado_por_fkey";

-- DropIndex
DROP INDEX "seguimientos_estado_validacion_idx";

-- AlterTable
ALTER TABLE "seguimientos" DROP COLUMN "comentario_validacion",
DROP COLUMN "estado",
DROP COLUMN "estado_validacion",
DROP COLUMN "evidencia_url",
DROP COLUMN "fecha_validacion",
DROP COLUMN "porcentaje_avance",
DROP COLUMN "validado_por",
ALTER COLUMN "comentario" SET NOT NULL;

-- DropEnum
DROP TYPE "EstadoSeguimiento";

-- DropEnum
DROP TYPE "EstadoValidacionSeguimiento";
