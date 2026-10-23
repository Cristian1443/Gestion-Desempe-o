-- Campos de los indicadores (de la empresa y de gerencia): línea estratégica (L1-L4),
-- objetivo estratégico, tipo de indicador (estratégico / de gestión), indicador y meta.
-- La línea ya existe como `linea_estrategica`; el objetivo vive en `descripcion` y el
-- indicador en `titulo`. Solo hace falta guardar el tipo.

CREATE TYPE "TipoIndicador" AS ENUM ('ESTRATEGICO', 'GESTION');

ALTER TABLE "objetivos" ADD COLUMN "tipo_indicador" "TipoIndicador";

ALTER TABLE "objetivos" ADD CONSTRAINT "chk_objetivo_tipo_indicador_solo_indicadores"
  CHECK ("tipo_indicador" IS NULL OR "nivel" IN ('CORPORATIVO', 'GERENCIA'));
