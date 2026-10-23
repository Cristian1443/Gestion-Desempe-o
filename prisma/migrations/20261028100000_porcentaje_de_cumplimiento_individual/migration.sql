-- Objetivos individuales de desempeño: el jefe pone el % de cumplimiento de cada meta al
-- final (0 a 100) y el Cumple / No cumple sale de ese % (80 o más cumple). Se vuelve a
-- permitir `calificacion_final`, pero solo en los individuales.
ALTER TABLE "objetivos" DROP CONSTRAINT IF EXISTS "chk_objetivo_sin_calificacion_numerica";
ALTER TABLE "objetivos" ADD CONSTRAINT "chk_objetivo_calificacion_solo_individual"
  CHECK ("calificacion_final" IS NULL OR "nivel" = 'INDIVIDUAL');
