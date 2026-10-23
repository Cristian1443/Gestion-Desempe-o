-- El tipo de indicador (estratégico / de gestión) no hace parte de los campos de los
-- indicadores: se retira la columna que agregó la migración anterior.
ALTER TABLE "objetivos" DROP CONSTRAINT IF EXISTS "chk_objetivo_tipo_indicador_solo_indicadores";
ALTER TABLE "objetivos" DROP COLUMN "tipo_indicador";
DROP TYPE "TipoIndicador";
