-- Por esta vigencia solo se manejan las metas individuales (los componentes de gerencia y de
-- resultado institucional están ocultos): las 4 metas de desempeño suman el 100 %, 25 % cada una.
UPDATE "objetivos" SET "peso" = 25 WHERE "nivel" = 'INDIVIDUAL' AND "tipo_individual" = 'DESEMPENO';
