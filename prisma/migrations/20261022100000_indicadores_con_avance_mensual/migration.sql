-- Indicadores de la empresa (objetivos CORPORATIVO): sin peso, avance mensual con
-- porcentaje y resultado final Cumple / No cumple.

-- 1) Avance mensual: un registro por (indicador, mes) con versiones al corregir.
CREATE TABLE "avances_indicador" (
    "id" TEXT NOT NULL,
    "objetivo_id" TEXT NOT NULL,
    "mes" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "porcentaje" INTEGER NOT NULL,
    "comentario" TEXT NOT NULL,
    "registrado_por" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avances_indicador_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_avance_indicador_porcentaje_rango" CHECK ("porcentaje" >= 0 AND "porcentaje" <= 100)
);

CREATE UNIQUE INDEX "avances_indicador_objetivo_id_mes_version_key" ON "avances_indicador"("objetivo_id", "mes", "version");
CREATE INDEX "avances_indicador_objetivo_id_idx" ON "avances_indicador"("objetivo_id");

ALTER TABLE "avances_indicador" ADD CONSTRAINT "avances_indicador_objetivo_id_fkey" FOREIGN KEY ("objetivo_id") REFERENCES "objetivos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "avances_indicador" ADD CONSTRAINT "avances_indicador_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2) Resultado final del indicador.
ALTER TABLE "objetivos" ADD COLUMN "cumplido" BOOLEAN;

-- 3) Quien ya tenía un % de calificación pasa a Cumple (>= 80) / No cumple.
UPDATE "objetivos"
SET "cumplido" = ("calificacion_final" >= 80),
    "calificacion_final" = NULL
WHERE "nivel" = 'CORPORATIVO' AND "calificacion_final" IS NOT NULL;

-- 4) Sin peso: primero se quita la regla de 3.75 exacto (solo existe si se aplicó
--    prisma/constraints.sql) y después los corporativos quedan en 0. El orden
--    importa: con la regla puesta, el UPDATE la violaría.
ALTER TABLE "objetivos" DROP CONSTRAINT IF EXISTS "chk_objetivo_peso_corporativo";
UPDATE "objetivos" SET "peso" = 0 WHERE "nivel" = 'CORPORATIVO';

-- 5) Reglas nuevas: `cumplido` solo en corporativos y los corporativos no llevan % de calificación.
ALTER TABLE "objetivos" ADD CONSTRAINT "chk_objetivo_cumplido_solo_corporativo"
  CHECK ("cumplido" IS NULL OR "nivel" = 'CORPORATIVO');
ALTER TABLE "objetivos" ADD CONSTRAINT "chk_objetivo_corporativo_sin_calificacion"
  CHECK ("nivel" <> 'CORPORATIVO' OR "calificacion_final" IS NULL);
