-- Pesos por nivel, repartidos por igual: individuales 40 % (4 objetivos de
-- desempeño de 10 %), gerencia 30 % (2 indicadores de 15 %) y empresa 30 %
-- (8 indicadores de 3.75 %). Los de desarrollo no llevan peso.
UPDATE "objetivos" SET "peso" = 10 WHERE "nivel" = 'INDIVIDUAL' AND "tipo_individual" = 'DESEMPENO';
UPDATE "objetivos" SET "peso" = 0 WHERE "nivel" = 'INDIVIDUAL' AND "tipo_individual" = 'DESARROLLO';
UPDATE "objetivos" SET "peso" = 15 WHERE "nivel" = 'GERENCIA';
UPDATE "objetivos" SET "peso" = 3.75 WHERE "nivel" = 'CORPORATIVO';
