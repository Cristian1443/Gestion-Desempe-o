-- De "cortes" abiertos a mano a seguimientos numerados con franja de fechas.
--
--   cortes (nombre, fecha_limite, estado)  ->  seguimientos (fecha_inicio, fecha_fin)
--   seguimientos (registro por objetivo)   ->  registros_seguimiento
--
-- Solo se renombra y se agregan/quitan columnas: ningún registro se pierde, salvo
-- `porcentaje_avance` (el % ahora se pone una sola vez, al final) y el nombre y
-- estado de los cortes.

-- 1) El registro por objetivo libera el nombre "seguimientos".
ALTER TABLE "seguimientos" RENAME TO "registros_seguimiento";
ALTER TABLE "registros_seguimiento" RENAME CONSTRAINT "seguimientos_pkey" TO "registros_seguimiento_pkey";
ALTER TABLE "registros_seguimiento" RENAME CONSTRAINT "seguimientos_objetivo_id_fkey" TO "registros_seguimiento_objetivo_id_fkey";
ALTER TABLE "registros_seguimiento" RENAME CONSTRAINT "seguimientos_registrado_por_fkey" TO "registros_seguimiento_registrado_por_fkey";
ALTER TABLE "registros_seguimiento" RENAME CONSTRAINT "seguimientos_corte_id_fkey" TO "registros_seguimiento_seguimiento_id_fkey";
ALTER TABLE "registros_seguimiento" RENAME COLUMN "corte_id" TO "seguimiento_id";
ALTER INDEX "seguimientos_corte_id_idx" RENAME TO "registros_seguimiento_seguimiento_id_idx";
ALTER INDEX "seguimientos_objetivo_id_corte_id_version_key" RENAME TO "registros_seguimiento_objetivo_id_seguimiento_id_version_key";

-- 2) Los registros ya no llevan porcentaje de avance (esto elimina también su CHECK).
ALTER TABLE "registros_seguimiento" DROP CONSTRAINT IF EXISTS "chk_seguimiento_porcentaje_rango";
ALTER TABLE "registros_seguimiento" DROP COLUMN "porcentaje_avance";

-- 3) El corte pasa a ser el seguimiento.
ALTER TABLE "cortes" RENAME TO "seguimientos";
ALTER TABLE "seguimientos" RENAME CONSTRAINT "cortes_pkey" TO "seguimientos_pkey";
ALTER TABLE "seguimientos" RENAME CONSTRAINT "cortes_periodo_id_fkey" TO "seguimientos_periodo_id_fkey";
ALTER INDEX "cortes_periodo_id_numero_key" RENAME TO "seguimientos_periodo_id_numero_key";

-- 4) Franja: el inicio de cada seguimiento es el día siguiente al fin del anterior
--    (el primero arranca con el periodo), nunca después de su propio fin.
ALTER TABLE "seguimientos" ADD COLUMN "fecha_inicio" TIMESTAMP(3);

UPDATE "seguimientos" s
SET "fecha_inicio" = LEAST(
  COALESCE(
    (SELECT prev."fecha_limite" + INTERVAL '1 day'
       FROM "seguimientos" prev
      WHERE prev."periodo_id" = s."periodo_id" AND prev."numero" < s."numero"
      ORDER BY prev."numero" DESC
      LIMIT 1),
    (SELECT p."fecha_inicio" FROM "periodos" p WHERE p."id" = s."periodo_id")
  ),
  s."fecha_limite"
);

ALTER TABLE "seguimientos" ALTER COLUMN "fecha_inicio" SET NOT NULL;
ALTER TABLE "seguimientos" RENAME COLUMN "fecha_limite" TO "fecha_fin";
ALTER TABLE "seguimientos" DROP COLUMN "nombre";
ALTER TABLE "seguimientos" DROP COLUMN "estado";
DROP TYPE "EstadoCorte";

-- 5) Franja del % de cumplimiento final: la define Gestión Humana (sin relleno).
ALTER TABLE "periodos" ADD COLUMN "cumplimiento_inicio" TIMESTAMP(3);
ALTER TABLE "periodos" ADD COLUMN "cumplimiento_fin" TIMESTAMP(3);

-- 6) El estado de periodo "EN_EVALUACION" desaparece; quien estuviera ahí sigue Abierto.
UPDATE "periodos" SET "estado" = 'ABIERTO' WHERE "estado" = 'EN_EVALUACION';
ALTER TYPE "EstadoPeriodo" RENAME TO "EstadoPeriodo_old";
CREATE TYPE "EstadoPeriodo" AS ENUM ('BORRADOR', 'ABIERTO', 'CERRADO');
ALTER TABLE "periodos" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "periodos" ALTER COLUMN "estado" TYPE "EstadoPeriodo" USING ("estado"::text::"EstadoPeriodo");
ALTER TABLE "periodos" ALTER COLUMN "estado" SET DEFAULT 'BORRADOR';
DROP TYPE "EstadoPeriodo_old";
