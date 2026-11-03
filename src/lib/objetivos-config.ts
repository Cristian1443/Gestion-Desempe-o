import type { Prisma } from "@prisma/client";
import { CANTIDAD_OBJETIVOS_DESARROLLO } from "@/server/services/calculo-notas";

// Los objetivos de desarrollo no se manejan lo que queda de 2026: el próximo año
// sí. Con el interruptor apagado no se piden al proponer, no se muestran y no
// cuentan para cerrar el periodo; los que ya existan en la base se conservan.
// Para reactivarlos basta con cambiar esta constante a `true`.
export const DESARROLLO_HABILITADO = false;

// Cuántos objetivos de desarrollo debe proponer cada persona hoy.
export const CANTIDAD_DESARROLLO_ACTIVA = DESARROLLO_HABILITADO ? CANTIDAD_OBJETIVOS_DESARROLLO : 0;

// Filtro de Prisma para las consultas de objetivos: deja fuera los de desarrollo
// mientras estén desactivados. Los objetivos de gerencia y de la empresa no tienen
// tipo (es nulo) y deben seguir pasando, de ahí el `OR`: un `not` a secas también
// descartaría los nulos.
export const FILTRO_OBJETIVOS_ACTIVOS: Prisma.ObjetivoWhereInput = DESARROLLO_HABILITADO
  ? {}
  : { OR: [{ tipoIndividual: null }, { tipoIndividual: { not: "DESARROLLO" } }] };
