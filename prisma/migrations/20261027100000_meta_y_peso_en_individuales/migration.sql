-- Objetivos individuales de desempeño: llevan meta y peso (los 4 suman 100 %).
-- Hasta ahora la meta no aplicaba a los individuales y una regla lo impedía.
ALTER TABLE "objetivos" DROP CONSTRAINT IF EXISTS "chk_objetivo_meta_no_individual";
