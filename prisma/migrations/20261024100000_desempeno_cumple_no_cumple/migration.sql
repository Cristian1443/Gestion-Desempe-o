-- Objetivos individuales de desempeño: sin peso y con resultado Cumple / No cumple
-- (igual que los indicadores), en vez de un % de cumplimiento de 0 a 100.

-- 1) Se sueltan las reglas que dependen de la forma vieja, antes de tocar datos.
ALTER TABLE "objetivos" DROP CONSTRAINT IF EXISTS "chk_objetivo_cumplido_solo_indicadores";
ALTER TABLE "objetivos" DROP CONSTRAINT IF EXISTS "chk_objetivo_indicador_sin_calificacion";

-- 2) Quien ya tenía un % de calificación pasa a Cumple (>= 80) / No cumple.
UPDATE "objetivos"
SET "cumplido" = ("calificacion_final" >= 80),
    "calificacion_final" = NULL
WHERE "nivel" = 'INDIVIDUAL' AND "calificacion_final" IS NOT NULL;

-- 3) Sin peso.
UPDATE "objetivos" SET "peso" = 0 WHERE "nivel" = 'INDIVIDUAL';

-- 4) Reglas nuevas: `cumplido` no aplica a desarrollo (que usa cumplio_desarrollo) y
--    ningún objetivo lleva ya un % numérico de calificación.
ALTER TABLE "objetivos" ADD CONSTRAINT "chk_objetivo_cumplido_no_desarrollo"
  CHECK ("cumplido" IS NULL OR "tipo_individual" IS DISTINCT FROM 'DESARROLLO');
ALTER TABLE "objetivos" ADD CONSTRAINT "chk_objetivo_sin_calificacion_numerica"
  CHECK ("calificacion_final" IS NULL);
