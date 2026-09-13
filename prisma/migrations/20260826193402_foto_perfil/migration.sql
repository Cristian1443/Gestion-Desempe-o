-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "foto" BYTEA,
ADD COLUMN     "foto_actualizada" TIMESTAMP(3),
ADD COLUMN     "foto_tipo" TEXT;
