-- Reglas de integridad que Prisma Schema todavía no expresa de forma nativa
-- (CHECK constraints entre `nivel` y las columnas usuario_id / gerencia_id).
--
-- Cómo aplicarlas:
--   1. Después de correr la migración inicial: npx prisma migrate dev --name init
--   2. Ejecutar este archivo una sola vez:
--      npx prisma db execute --file prisma/constraints.sql --schema prisma/schema.prisma
--   3. Si vuelves a resetear la base con `prisma migrate reset`, hay que
--      volver a ejecutarlo (no queda registrado en el historial de migraciones
--      de Prisma). Alternativa: pegar este mismo SQL al final del archivo
--      migration.sql generado en el paso 1 antes de aplicarlo.

ALTER TABLE objetivos
  ADD CONSTRAINT chk_objetivo_nivel_individual
  CHECK (nivel <> 'INDIVIDUAL' OR (usuario_id IS NOT NULL AND gerencia_id IS NULL));

ALTER TABLE objetivos
  ADD CONSTRAINT chk_objetivo_nivel_gerencia
  CHECK (nivel <> 'GERENCIA' OR (gerencia_id IS NOT NULL AND usuario_id IS NULL));

ALTER TABLE objetivos
  ADD CONSTRAINT chk_objetivo_nivel_corporativo
  CHECK (nivel <> 'CORPORATIVO' OR (usuario_id IS NULL AND gerencia_id IS NULL));

-- Peso fijo por nivel (ver motor de cálculo para el detalle de por qué estos
-- valores exactos: 30% / 2 objetivos = 15.00). Los corporativos no llevan peso.
ALTER TABLE objetivos
  ADD CONSTRAINT chk_objetivo_peso_gerencia
  CHECK (nivel <> 'GERENCIA' OR peso = 15.00);

-- Todo objetivo INDIVIDUAL debe traer su clasificación (desempeño vs.
-- desarrollo); los demás niveles no la usan.
ALTER TABLE objetivos
  ADD CONSTRAINT chk_objetivo_tipo_individual
  CHECK (
    (nivel = 'INDIVIDUAL' AND tipo_individual IS NOT NULL)
    OR (nivel <> 'INDIVIDUAL' AND tipo_individual IS NULL)
  );

-- DESEMPEÑO va contra una línea estratégica del catálogo fijo (L1-L5) y no
-- lleva competencia. DESARROLLO va contra una competencia en texto libre y
-- no lleva línea estratégica.
ALTER TABLE objetivos
  ADD CONSTRAINT chk_objetivo_desempeno_linea
  CHECK (
    tipo_individual <> 'DESEMPENO'
    OR (linea_estrategica IS NOT NULL AND competencia IS NULL)
  );

ALTER TABLE objetivos
  ADD CONSTRAINT chk_objetivo_desarrollo_competencia
  CHECK (
    tipo_individual <> 'DESARROLLO'
    OR (competencia IS NOT NULL AND linea_estrategica IS NULL)
  );

-- `acciones` es obligatorio en INDIVIDUAL (línea, descripción, peso,
-- indicadores, acciones y link son los 6 campos del formulario real) y no
-- aplica a los demás niveles.
ALTER TABLE objetivos
  ADD CONSTRAINT chk_objetivo_acciones_individual
  CHECK (
    (nivel = 'INDIVIDUAL' AND acciones IS NOT NULL)
    OR (nivel <> 'INDIVIDUAL' AND acciones IS NULL)
  );

-- `meta` y `unidad_medida` son propios de GERENCIA/CORPORATIVO — en
-- INDIVIDUAL no se piden en el formulario, así que deben quedar nulos.
ALTER TABLE objetivos
  ADD CONSTRAINT chk_objetivo_meta_no_individual
  CHECK (nivel <> 'INDIVIDUAL' OR meta IS NULL);

ALTER TABLE objetivos
  ADD CONSTRAINT chk_objetivo_unidad_medida_no_individual
  CHECK (nivel <> 'INDIVIDUAL' OR unidad_medida IS NULL);

-- calificacion_final siempre entre 0 y 100 (cuando ya fue asignada).
ALTER TABLE objetivos
  ADD CONSTRAINT chk_objetivo_calificacion_rango
  CHECK (calificacion_final IS NULL OR (calificacion_final >= 0 AND calificacion_final <= 100));

-- Los objetivos de DESARROLLO no tienen nota numérica (se marcan sí/no vía
-- cumplio_desarrollo); los demás tipos/niveles no usan cumplio_desarrollo.
ALTER TABLE objetivos
  ADD CONSTRAINT chk_objetivo_calificacion_no_desarrollo
  CHECK (calificacion_final IS NULL OR tipo_individual IS DISTINCT FROM 'DESARROLLO');

ALTER TABLE objetivos
  ADD CONSTRAINT chk_objetivo_cumplido_solo_desarrollo
  CHECK (cumplio_desarrollo IS NULL OR tipo_individual = 'DESARROLLO');
