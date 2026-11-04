import type { Prisma } from "@prisma/client";
import {
  CANTIDAD_OBJETIVOS_DESARROLLO,
  CANTIDAD_OBJETIVOS_DESEMPENO,
  PESO_TOTAL_DESEMPENO,
} from "@/server/services/calculo-notas";

// Por esta vigencia solo se manejan las metas individuales: los componentes de gerencia (C2)
// y de resultado institucional (C3) están ocultos (pestañas, tarjetas, cierre del periodo,
// tablero de resultados y PDF), sin borrar su código ni sus datos. Para reactivarlos basta
// con cambiar esta constante a `true` (y volver a poner los pesos individuales en 10 %: ver
// `PESO_TOTAL_INDIVIDUALES`, que pasa a 40 solo).
export const COMPONENTES_GERENCIA_Y_EMPRESA_HABILITADOS = false;

// Con C2 y C3 ocultos, las 4 metas individuales suman el 100 % (25 % cada una). Si se
// reactivan, las individuales vuelven a ser el 40 % de la nota (10 % cada una).
export const PESO_TOTAL_INDIVIDUALES = COMPONENTES_GERENCIA_Y_EMPRESA_HABILITADOS ? PESO_TOTAL_DESEMPENO : 100;
export const PESO_OBJETIVO_INDIVIDUAL = PESO_TOTAL_INDIVIDUALES / CANTIDAD_OBJETIVOS_DESEMPENO;

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
