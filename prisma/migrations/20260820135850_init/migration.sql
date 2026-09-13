-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('COLABORADOR', 'JEFE', 'GERENTE', 'GESTION_HUMANA', 'ADMIN');

-- CreateEnum
CREATE TYPE "NivelObjetivo" AS ENUM ('INDIVIDUAL', 'GERENCIA', 'CORPORATIVO');

-- CreateEnum
CREATE TYPE "TipoObjetivoIndividual" AS ENUM ('DESEMPENO', 'DESARROLLO');

-- CreateEnum
CREATE TYPE "LineaEstrategica" AS ENUM ('L1', 'L2', 'L3', 'L4', 'L5');

-- CreateEnum
CREATE TYPE "EstadoPeriodo" AS ENUM ('BORRADOR', 'ABIERTO', 'EN_EVALUACION', 'CERRADO');

-- CreateEnum
CREATE TYPE "EstadoAprobacionObjetivo" AS ENUM ('BORRADOR', 'PENDIENTE_APROBACION', 'APROBADO', 'DEVUELTO');

-- CreateEnum
CREATE TYPE "EstadoSeguimiento" AS ENUM ('NO_INICIADO', 'EN_PROGRESO', 'CUMPLIDO', 'NO_CUMPLIDO');

-- CreateEnum
CREATE TYPE "EstadoValidacionSeguimiento" AS ENUM ('REPORTADO', 'VALIDADO', 'DEVUELTO');

-- CreateEnum
CREATE TYPE "EstadoEvaluacion" AS ENUM ('EN_PROGRESO', 'CALIFICADO', 'CERRADO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "entra_object_id" TEXT,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "gerencia_id" TEXT,
    "jefe_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_roles" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gerencias" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "gerente_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gerencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoPeriodo" NOT NULL DEFAULT 'BORRADOR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "periodos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cortes" (
    "id" TEXT NOT NULL,
    "periodo_id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "fecha_limite" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cortes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objetivos" (
    "id" TEXT NOT NULL,
    "periodo_id" TEXT NOT NULL,
    "nivel" "NivelObjetivo" NOT NULL,
    "usuario_id" TEXT,
    "gerencia_id" TEXT,
    "tipo_individual" "TipoObjetivoIndividual",
    "linea_estrategica" "LineaEstrategica",
    "competencia" TEXT,
    "link_repositorio" TEXT,
    "acciones" TEXT,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "meta" TEXT,
    "indicador" TEXT NOT NULL,
    "unidad_medida" TEXT,
    "peso" DECIMAL(5,2) NOT NULL,
    "estado_aprobacion" "EstadoAprobacionObjetivo" NOT NULL DEFAULT 'BORRADOR',
    "comentario_aprobacion" TEXT,
    "creado_por" TEXT NOT NULL,
    "aprobado_por" TEXT,
    "fecha_aprobacion" TIMESTAMP(3),
    "calificacion_final" DECIMAL(5,2),
    "calificado_por" TEXT,
    "fecha_calificacion" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "objetivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seguimientos" (
    "id" TEXT NOT NULL,
    "objetivo_id" TEXT NOT NULL,
    "corte_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "porcentaje_avance" DECIMAL(5,2) NOT NULL,
    "estado" "EstadoSeguimiento" NOT NULL,
    "comentario" TEXT,
    "evidencia_url" TEXT,
    "registrado_por" TEXT NOT NULL,
    "estado_validacion" "EstadoValidacionSeguimiento" NOT NULL DEFAULT 'REPORTADO',
    "validado_por" TEXT,
    "fecha_validacion" TIMESTAMP(3),
    "comentario_validacion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seguimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluaciones" (
    "id" TEXT NOT NULL,
    "periodo_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "nota_individual" DECIMAL(5,2),
    "nota_gerencia" DECIMAL(5,2),
    "nota_corporativa" DECIMAL(5,2),
    "nota_final" DECIMAL(5,2),
    "estado" "EstadoEvaluacion" NOT NULL DEFAULT 'EN_PROGRESO',
    "calculado_en" TIMESTAMP(3),
    "fecha_cierre" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "campo" TEXT,
    "valor_anterior" JSONB,
    "valor_nuevo" JSONB,
    "realizado_por" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_entra_object_id_key" ON "usuarios"("entra_object_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_gerencia_id_idx" ON "usuarios"("gerencia_id");

-- CreateIndex
CREATE INDEX "usuarios_jefe_id_idx" ON "usuarios"("jefe_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_roles_usuario_id_rol_key" ON "usuario_roles"("usuario_id", "rol");

-- CreateIndex
CREATE UNIQUE INDEX "gerencias_nombre_key" ON "gerencias"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "gerencias_gerente_id_key" ON "gerencias"("gerente_id");

-- CreateIndex
CREATE UNIQUE INDEX "periodos_nombre_key" ON "periodos"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "cortes_periodo_id_numero_key" ON "cortes"("periodo_id", "numero");

-- CreateIndex
CREATE INDEX "objetivos_periodo_id_nivel_idx" ON "objetivos"("periodo_id", "nivel");

-- CreateIndex
CREATE INDEX "objetivos_usuario_id_idx" ON "objetivos"("usuario_id");

-- CreateIndex
CREATE INDEX "objetivos_gerencia_id_idx" ON "objetivos"("gerencia_id");

-- CreateIndex
CREATE INDEX "seguimientos_corte_id_idx" ON "seguimientos"("corte_id");

-- CreateIndex
CREATE INDEX "seguimientos_estado_validacion_idx" ON "seguimientos"("estado_validacion");

-- CreateIndex
CREATE UNIQUE INDEX "seguimientos_objetivo_id_corte_id_version_key" ON "seguimientos"("objetivo_id", "corte_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "evaluaciones_periodo_id_usuario_id_key" ON "evaluaciones"("periodo_id", "usuario_id");

-- CreateIndex
CREATE INDEX "auditoria_entidad_entidad_id_idx" ON "auditoria"("entidad", "entidad_id");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_gerencia_id_fkey" FOREIGN KEY ("gerencia_id") REFERENCES "gerencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_jefe_id_fkey" FOREIGN KEY ("jefe_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_roles" ADD CONSTRAINT "usuario_roles_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gerencias" ADD CONSTRAINT "gerencias_gerente_id_fkey" FOREIGN KEY ("gerente_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cortes" ADD CONSTRAINT "cortes_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objetivos" ADD CONSTRAINT "objetivos_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objetivos" ADD CONSTRAINT "objetivos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objetivos" ADD CONSTRAINT "objetivos_gerencia_id_fkey" FOREIGN KEY ("gerencia_id") REFERENCES "gerencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objetivos" ADD CONSTRAINT "objetivos_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objetivos" ADD CONSTRAINT "objetivos_aprobado_por_fkey" FOREIGN KEY ("aprobado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objetivos" ADD CONSTRAINT "objetivos_calificado_por_fkey" FOREIGN KEY ("calificado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimientos" ADD CONSTRAINT "seguimientos_objetivo_id_fkey" FOREIGN KEY ("objetivo_id") REFERENCES "objetivos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimientos" ADD CONSTRAINT "seguimientos_corte_id_fkey" FOREIGN KEY ("corte_id") REFERENCES "cortes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimientos" ADD CONSTRAINT "seguimientos_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimientos" ADD CONSTRAINT "seguimientos_validado_por_fkey" FOREIGN KEY ("validado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluaciones" ADD CONSTRAINT "evaluaciones_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluaciones" ADD CONSTRAINT "evaluaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_realizado_por_fkey" FOREIGN KEY ("realizado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
