-- Objetivos individuales de desempeño: "Indicador" (el nombre), que se llena desde el
-- principio, aparte de la "Fórmula del indicador" (columna `indicador`). Nulo en los
-- objetivos propuestos antes de este cambio.
ALTER TABLE "objetivos" ADD COLUMN "nombre_indicador" TEXT;
