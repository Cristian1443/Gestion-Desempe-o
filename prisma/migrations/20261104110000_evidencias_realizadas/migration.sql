-- Evidencias realizadas: lo que el colaborador cuenta que hizo, un texto por objetivo
-- individual y por seguimiento. Solo se puede escribir antes de cada seguimiento.
CREATE TABLE "evidencias_objetivo" (
    "id" TEXT NOT NULL,
    "objetivo_id" TEXT NOT NULL,
    "seguimiento_id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "registrado_por" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidencias_objetivo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "evidencias_objetivo_objetivo_id_seguimiento_id_key" ON "evidencias_objetivo"("objetivo_id", "seguimiento_id");
CREATE INDEX "evidencias_objetivo_seguimiento_id_idx" ON "evidencias_objetivo"("seguimiento_id");

ALTER TABLE "evidencias_objetivo" ADD CONSTRAINT "evidencias_objetivo_objetivo_id_fkey"
  FOREIGN KEY ("objetivo_id") REFERENCES "objetivos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evidencias_objetivo" ADD CONSTRAINT "evidencias_objetivo_seguimiento_id_fkey"
  FOREIGN KEY ("seguimiento_id") REFERENCES "seguimientos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evidencias_objetivo" ADD CONSTRAINT "evidencias_objetivo_registrado_por_fkey"
  FOREIGN KEY ("registrado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
