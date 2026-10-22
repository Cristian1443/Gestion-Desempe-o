-- Indicadores de la gerencia: igual que los de la empresa (sin peso, % de avance
-- con comentario en cada seguimiento y resultado final Cumple / No cumple).

-- 1) % de avance acumulado de cada registro de seguimiento. Nulo para los
--    objetivos individuales; el servicio lo exige para los de gerencia. Los
--    registros que ya existían quedan sin % (no se inventa).
ALTER TABLE "registros_seguimiento" ADD COLUMN "porcentaje" INTEGER;
ALTER TABLE "registros_seguimiento" ADD CONSTRAINT "chk_registro_seguimiento_porcentaje_rango"
  CHECK ("porcentaje" IS NULL OR ("porcentaje" >= 0 AND "porcentaje" <= 100));

-- 2) Quien ya tenía un % de calificación pasa a Cumple (>= 80) / No cumple.
--    Antes de tocar nada se sueltan las reglas que dependen de la forma vieja:
--    `cumplido` solo para corporativos y sin % de calificación.
ALTER TABLE "objetivos" DROP CONSTRAINT IF EXISTS "chk_objetivo_cumplido_solo_corporativo";
ALTER TABLE "objetivos" DROP CONSTRAINT IF EXISTS "chk_objetivo_corporativo_sin_calificacion";

UPDATE "objetivos"
SET "cumplido" = ("calificacion_final" >= 80),
    "calificacion_final" = NULL
WHERE "nivel" = 'GERENCIA' AND "calificacion_final" IS NOT NULL;

-- 3) Sin peso: primero se quita la regla de 15.00 exacto (solo existe si se aplicó
--    prisma/constraints.sql) y después los de gerencia quedan en 0. El orden
--    importa: con la regla puesta, el UPDATE la violaría.
ALTER TABLE "objetivos" DROP CONSTRAINT IF EXISTS "chk_objetivo_peso_gerencia";
UPDATE "objetivos" SET "peso" = 0 WHERE "nivel" = 'GERENCIA';

-- 4) Reglas nuevas: `cumplido` en indicadores (empresa y gerencia) y estos no
--    llevan % de calificación.
ALTER TABLE "objetivos" ADD CONSTRAINT "chk_objetivo_cumplido_solo_indicadores"
  CHECK ("cumplido" IS NULL OR "nivel" IN ('CORPORATIVO', 'GERENCIA'));
ALTER TABLE "objetivos" ADD CONSTRAINT "chk_objetivo_indicador_sin_calificacion"
  CHECK ("nivel" NOT IN ('CORPORATIVO', 'GERENCIA') OR "calificacion_final" IS NULL);
