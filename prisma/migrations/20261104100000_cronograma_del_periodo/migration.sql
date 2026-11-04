-- Cronograma del periodo: actividades con su franja de fechas (cargar indicadores,
-- aprobación de jefes, carga de evidencia…). Los seguimientos y la franja del
-- resultado final ya existían y el cronograma los toma de ahí.
CREATE TABLE "actividades_cronograma" (
    "id" TEXT NOT NULL,
    "periodo_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actividades_cronograma_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "actividades_cronograma_periodo_id_idx" ON "actividades_cronograma"("periodo_id");

ALTER TABLE "actividades_cronograma" ADD CONSTRAINT "actividades_cronograma_periodo_id_fkey"
  FOREIGN KEY ("periodo_id") REFERENCES "periodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Periodo 2026 (lo que queda del año): cronograma acordado.
--   5 al 11 nov   Cargar indicadores
--   12 al 13 nov  Aprobación de jefes
--   17 al 20 nov  Primer seguimiento
--   1 al 20 ene   Carga de evidencia
--   21 al 30 ene  Validación de evidencia y evaluación del jefe (resultado final)
INSERT INTO "actividades_cronograma" ("id", "periodo_id", "nombre", "fecha_inicio", "fecha_fin", "updated_at")
SELECT 'cron2026_' || v.orden, p."id", v.nombre, v.inicio::timestamp, v.fin::timestamp, CURRENT_TIMESTAMP
FROM "periodos" p,
  (VALUES
    (1, 'Cargar indicadores', '2026-11-05', '2026-11-11'),
    (2, 'Aprobación de jefes', '2026-11-12', '2026-11-13'),
    (3, 'Carga de evidencia', '2027-01-01', '2027-01-20')
  ) AS v(orden, nombre, inicio, fin)
WHERE p."nombre" = '2026' AND p."estado" <> 'CERRADO';

UPDATE "seguimientos" s
SET "fecha_inicio" = '2026-11-17'::timestamp, "fecha_fin" = '2026-11-20'::timestamp
FROM "periodos" p
WHERE s."periodo_id" = p."id" AND p."nombre" = '2026' AND p."estado" <> 'CERRADO' AND s."numero" = 1;

UPDATE "periodos"
SET "cumplimiento_inicio" = '2027-01-21'::timestamp, "cumplimiento_fin" = '2027-01-30'::timestamp
WHERE "nombre" = '2026' AND "estado" <> 'CERRADO';
