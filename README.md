# Gestión del Desempeño — Invest in Bogotá

Reemplazo a la medida de la app de Power Apps / SharePoint. Modelo de evaluación
de 3 niveles ponderados (individual 40%, gerencia 30%, corporativo 30%) con
seguimiento trimestral de ejecución.

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** API Routes / Server Actions de Next.js
- **Base de datos:** PostgreSQL + Prisma
- **Autenticación:** Auth.js (NextAuth v5) con Microsoft Entra ID, estrategia
  JWT (sin adapter de base de datos — ver decisión más abajo)
- **Despliegue:** Docker (`Dockerfile` + `docker-compose.yml`)

## Decisiones de diseño confirmadas

Estas se definieron explícitamente con el equipo de Transformación Digital
antes de construir el esquema:

1. **Flujo de aprobación de objetivos individuales:** el colaborador propone
   → el jefe directo aprueba, edita o devuelve con comentario
   (`Objetivo.estadoAprobacion`).
2. **Seguimientos numerados con franja de fechas:** son una entidad
   explícita (`Seguimiento`), que Gestión Humana configura por periodo
   (cuántos hay y la franja desde–hasta de cada uno). Se registran solo dentro
   de su franja; ver "Seguimientos y % de cumplimiento" más abajo.
3. **Seguimiento en niveles superiores:** los objetivos de gerencia y
   corporativos también llevan seguimiento en cada franja (no solo una nota
   final al cierre), en los 3 niveles.

## Decisiones técnicas y su razón

- **Auth.js sin adapter de Prisma:** en vez de usar `@auth/prisma-adapter`
  (que crea sus propias tablas `Account`/`Session`/`User`), se usa estrategia
  JWT pura. En el callback `signIn`/`jwt` se busca o aprovisiona el registro
  en `Usuario` por `entraObjectId` (claim `oid` de Entra ID). Esto evita tener
  dos modelos de "usuario" (el de NextAuth y el de negocio) y mantiene
  `Usuario` como única fuente de verdad para roles y jerarquía.
- **`Usuario.entraObjectId` es opcional (pre-registro + vinculación por
  correo):** Gestión Humana puede dar de alta a alguien en la estructura
  organizacional (con su jefe, gerencia y roles) antes de que esa persona
  haya iniciado sesión ni una sola vez — `entraObjectId` queda en `null`
  ("pendiente"). La primera vez que esa cuenta entra por SSO,
  `resolverUsuarioParaLogin` la empareja por correo y completa el
  `entraObjectId` automáticamente, sin intervención manual. Es el patrón
  estándar de "invitar antes del primer login" en apps empresariales, y evita
  que Gestión Humana dependa de que TI le pase IDs de Azure AD para poder
  armar el organigrama.
- **Auto-aprovisionamiento en el primer login, si nadie lo pre-registró:**
  cuando alguien inicia sesión y no hay ningún `Usuario` con su correo (ni
  vinculado ni pendiente), en vez de rechazarlo se crea un perfil base
  (rol `COLABORADOR`, sin jefe ni gerencia todavía) y queda activo de una
  vez. Esto es seguro porque el control de acceso real vive en Entra ID, no
  en esta capa: el App Registration tiene **"Assignment required" activado
  con el grupo de colaboradores activos asignado** (ver
  "Configurar el App Registration"), así que solo alguien de ese grupo llega
  siquiera a la pantalla de login. `Usuario.activo` sigue siendo el
  interruptor para desactivar a alguien después (offboarding), y Gestión
  Humana completa jefe/gerencia/roles desde Estructura organizacional cuando
  pueda — no bloquea el primer acceso. Esto convive con el camino de
  pre-registro manual: si Gestión Humana ya dio de alta a la persona de
  antemano (con su jefe y gerencia ya definidos), esa información no se
  pierde, simplemente se vincula en vez de crear un perfil nuevo.
- **Un solo modelo `Objetivo` para los 3 niveles:** en vez de 3 tablas
  separadas, se discrimina por la columna `nivel`. Esto simplifica el motor de
  cálculo (una sola consulta agrupa por nivel) y el módulo de seguimiento
  (`Seguimiento` referencia cualquier objetivo sin importar el nivel).
  La integridad `nivel` ↔ `usuarioId`/`gerenciaId` se refuerza con:
  - Validación en el servicio (Zod) antes de escribir.
  - `CHECK` constraints a nivel de base de datos — ver `prisma/constraints.sql`,
    porque Prisma Schema todavía no expresa constraints condicionales de forma
    nativa.
- **Normalización de pesos por nivel:** los pesos de gerencia (15% × 2) y
  corporativos (3.75% × 8) sí suman exactamente el peso total del nivel
  (30% y 30%), a diferencia de los individuales que suman 100 dentro del
  nivel y luego se multiplican por 0.40. El motor de cálculo (fase 2) normaliza
  ambos casos con la misma fórmula: `Σ(peso_i / Σpeso_nivel × nota_i)`, así que
  el caso gerencia/corporativo es matemáticamente equivalente (pesos iguales
  entre sí) sin necesitar una fórmula distinta.
- **`RegistroSeguimiento` es append-only con `version`:** corregir un
  comentario no lo edita — se crea una nueva fila con `version + 1` para el
  mismo `(objetivoId, seguimientoId)`. La vigente es siempre la de mayor
  versión. Así el historial completo queda intacto para auditoría.
- **`output: "standalone"` en Next.js:** necesario para que el `Dockerfile`
  multi-stage copie solo lo que se usa en runtime, sin todo `node_modules`.
- **Auth.js dividido en dos configuraciones (`auth.config.ts` + `auth.ts`):**
  el Middleware de Next.js corre en el runtime Edge, que no soporta el motor
  nativo de Prisma. Por eso `src/server/auth/auth.config.ts` es "edge-safe"
  (sin ningún import de Prisma) y solo resuelve la pregunta rápida
  "¿hay sesión?" a través del callback `authorized`, usado por
  [middleware.ts](middleware.ts). La configuración completa
  ([src/auth.ts](src/auth.ts)), con los callbacks `signIn`/`jwt`/`session` que
  sí consultan la base de datos, corre en Route Handlers y Server
  Components (runtime Node.js). La verificación real de "¿sigue activo?" y de
  roles ocurre ahí, nunca en el Middleware.
- **Restricción a personal de la empresa, en dos capas:** (1) el App
  Registration de Entra ID se configura como *single-tenant*, así que solo
  cuentas del tenant de Microsoft 365 de la organización pueden llegar a la
  pantalla de login; (2) en el callback `signIn` se exige que el
  `entraObjectId` (claim `oid`) ya exista como `Usuario.activo = true` en la
  base de datos — alguien con cuenta corporativa válida pero sin alta como
  colaborador, o desactivado, es redirigido a `/acceso-denegado`.
- **La sesión se re-valida contra la base de datos en cada lectura, no solo al
  iniciar sesión:** el JWT únicamente guarda el `entraObjectId`. Roles,
  gerencia y el estado `activo` se resuelven en el callback `session`
  consultando `Usuario` cada vez. Así, si Gestión Humana desactiva a alguien,
  pierde el acceso en la siguiente petición en vez de conservarlo hasta que
  expire el token (con estrategia JWT pura, sin esto, una desactivación no
  tendría efecto hasta el vencimiento del JWT).

## Estructura de carpetas

Lo ya creado hasta esta fase:

```
prisma/
  schema.prisma        Esquema completo (usuarios, gerencias, periodos,
                        seguimientos con franja, objetivos, registros, evaluaciones, auditoría)
  constraints.sql       CHECK constraints complementarios (ver arriba)
  seed.ts                Datos de ejemplo idempotentes para desarrollo local
                          (no es el script de migración real — eso es fase 5)
src/
  app/
    layout.tsx           Layout raíz (tema IIB)
    globals.css          Tailwind + paleta institucional
    page.tsx             Redirige a /mis-objetivos (home del dashboard)
    (auth)/
      login/page.tsx      Botón "Iniciar sesión con Microsoft"
      acceso-denegado/page.tsx  Cuenta válida en Entra ID pero sin alta/activa
    (dashboard)/
      layout.tsx           Header IIB + verificación de sesión activa
      NavTabs.tsx            Pestañas del dashboard (Client Component, según roles)
      mis-objetivos/
        page.tsx             Módulo colaborador: individuales + gerencia + corporativos
        components.tsx        Tarjetas de objetivo (Server Components)
        ProponerObjetivosForm.tsx  Formulario de propuesta (Client Component)
        actions.ts             Server Actions: reportar avance y proponer objetivos
      mi-equipo/
        page.tsx             Módulo jefe: aprobar objetivos, validar avances
        components.tsx        ColaboradorPanel (Server Component)
        actions.ts             Server Actions: aprobar/devolver/validar
      mi-gerencia/
        page.tsx             Módulo gerente: objetivos de gerencia + consolidado
        components.tsx        ObjetivoGerenciaCard + ColaboradorConsolidadoRow
        CrearObjetivosGerenciaForm.tsx  Formulario de carga (Client Component)
        actions.ts             Server Actions: crear objetivos y reportar avance
      administracion/
        page.tsx             Módulo Gestión Humana/Admin: corporativos + periodos
        components.tsx        ObjetivoCorporativoCard + PeriodoRow
        CrearObjetivosCorporativosForm.tsx  Formulario de carga (Client)
        CrearPeriodoForm.tsx / AgregarSeguimientoForm.tsx / FranjaCumplimientoForm.tsx  Formularios (Client)
        actions.ts             Server Actions: corporativos + ciclo de vida del periodo
        estructura/
          page.tsx               Gerencias + colaboradores + conexión jefe/gerencia
          components.tsx          GerenciaRow + UsuarioRow
          CrearGerenciaForm.tsx / AsignarGerenteForm.tsx  Formularios (Client)
          CrearUsuarioForm.tsx / EditarUsuarioDialog.tsx  Formularios (Client)
          actions.ts               Server Actions: gerencias + alta/edición de usuarios
      resultados/
        page.tsx             Tablero de solo lectura: avance global, riesgo
        components.tsx        TarjetaKpi + FilaGerencia + FilaObjetivoEnRiesgo
    api/auth/[...nextauth]/route.ts  Route Handler de Auth.js
  components/
    ReportarAvanceDialog.tsx  Diálogo de reporte compartido (individual/gerencia/corporativo)
    AccionesSimples.tsx        BotonAccionSimple + DialogDevolverConComentario (compartidos)
  lib/
    fecha.ts               formatearFecha — único lugar que formatea fechas de calendario
                            (fuerza timeZone UTC, ver nota del bug corregido)
  server/
    db.ts                Cliente Prisma singleton
    services/
      calculo-notas.ts    Motor de cálculo puro + tests (fase 2)
      semaforo.ts          Avance vs. tiempo transcurrido del periodo + tests
      periodos.service.ts   Lectura (obtenerPeriodoActual/obtenerContextoFranjas) +
                            administración (crear/abrir/cerrar periodo, seguimientos y franjas)
      objetivos.service.ts  Arma el modelo de vista de "Mis objetivos"
      seguimientos.service.ts  reportar avance (individual/gerencia/corporativo), validar/devolver
      aprobaciones.service.ts  proponer/aprobar/devolver objetivos individuales
      equipo.service.ts     Arma el modelo de vista de "Mi equipo"
      gerencia.service.ts   Crea objetivos de gerencia y arma "Mi gerencia"
      corporativos.service.ts  Crea objetivos corporativos y arma la vista de Administración
      resultados.service.ts   Arma el tablero: avance global, por gerencia, en riesgo
      usuarios.service.ts     resolverUsuarioParaLogin (vinculación por correo en 1er login)
      organizacion.service.ts  Gerencias + usuarios: alta, edición, conexión jefe/gerencia
    validations/
      seguimiento.schema.ts  Zod: valida el reporte de avance en el servidor
      aprobacion.schema.ts   Zod: valida propuestas, aprobaciones y devoluciones
      gerencia.schema.ts     Zod: valida la carga de objetivos de gerencia
      corporativo.schema.ts  Zod: valida la carga de objetivos corporativos
      organizacion.schema.ts  Zod: valida alta/edición de usuarios y gerencias
      periodo.schema.ts      Zod: valida creación de periodos, seguimientos y franjas
    auth/
      auth.config.ts      Config "edge-safe" (sin Prisma) — la usa el Middleware
      rbac.ts             requireUsuarioAutenticado / requireRol / tieneRol
  auth.ts                 Config completa de Auth.js (con Prisma) — Route
                          Handlers y Server Components
  types/next-auth.d.ts    Aumenta Session/JWT con los campos de dominio
middleware.ts             Protege todas las rutas excepto /login, /acceso-denegado
                          y las propias de Auth.js
tailwind.config.ts        Paleta IIB + semántica de semáforo (success/warning/danger,
                           deliberadamente distinta del rojo institucional)
tests/
  server/services/calculo-notas.test.ts  26 tests
  server/services/semaforo.test.ts        6 tests
  (32 tests en total, todos en verde)
Dockerfile / docker-compose.yml
.env.example
```

Lo que se irá agregando en las siguientes fases (no creado todavía, para no
dejar código a medias):

```
src/
  server/
    services/
      auditoria.service.ts     Pendiente (ver "Fuera de alcance" más abajo)
  app/
    api/
      objetivos/route.ts          Solo si algo llega a necesitarse fuera de Server Actions
      export/                     Exportar a Excel/PDF — pendiente
scripts/
  migracion-sharepoint/           Fase 5 — script idempotente vía Graph API
```

## Roadmap de entrega

1. ✅ Esquema de base de datos + estructura de carpetas
2. ✅ Motor de cálculo de notas + tests (26/26 ✓)
3. ✅ Autenticación (Microsoft Entra ID) y control de acceso por rol
4. ✅ Módulos:
   - ✅ Mis objetivos (colaborador) — proponer, ver, y reportar avance individual
   - ✅ Mi equipo (jefe) — aprobar/devolver objetivos, validar/devolver avances
     (falta "calificar al cierre" — ver nota al final de esa sección)
   - ✅ Mi gerencia (gerente) — cargar los 2 objetivos, reportar avance,
     consolidado del equipo
   - ✅ Administración (Gestión Humana) — corporativos, periodos y seguimientos con franja
   - ✅ Estructura organizacional — gerencias, alta de colaboradores,
     conexión empleado↔jefe, con vinculación automática al primer login
   - ✅ Tablero de resultados — avance global, cumplimiento por gerencia,
     objetivos en riesgo (distribución de calificaciones pendiente de
     "calificar al cierre")
5. Pendiente: script de migración desde SharePoint (para masificar la carga
   de la estructura organizacional con datos reales) + calificar al cierre +
   exportación a Excel/PDF

## Seguimientos y % de cumplimiento (modelo vigente)

Esta sección reemplaza al antiguo modelo de "cortes". Los apartados de módulos
de más abajo (Mis objetivos, Mi equipo, Mi gerencia, Administración) son el
historial de cómo se construyeron y todavía mencionan cortes, validación y
semáforo: describen el flujo anterior, no el actual.

- **Seguimientos numerados.** Cada periodo tiene N seguimientos (Seguimiento 1,
  2… N). Gestión Humana define cuántos hay y la **franja de fechas** (inicio y
  fin, inclusivos) de cada uno desde *Administración*. Las franjas van en orden y
  no se traslapan; cada seguimiento debe caer dentro del periodo.
- **Se controla solo, por fechas.** Un seguimiento se puede registrar únicamente
  dentro de su franja, con el periodo Abierto. Nadie abre ni cierra nada a mano.
  "Hoy" se calcula en hora de Bogotá (UTC-5), no en la hora del servidor (UTC);
  ver [src/lib/franja.ts](src/lib/franja.ts).
- **Qué se registra.** Cada seguimiento de un objetivo es un comentario con fecha
  y autor (`RegistroSeguimiento`); sin porcentaje. Quien lo hace: jefe directo
  (individual), gerente (gerencia), Gestión Humana/Admin/Gestor corporativo
  (corporativo). Corregir dentro de la franja crea una versión nueva.
- **% de cumplimiento final.** Es la antigua "calificación final" (0-100, columna
  `Objetivo.calificacionFinal`), con "Cumple" desde 80. Se pone una sola vez, al
  final, y solo dentro de la **franja del % de cumplimiento** que Gestión Humana
  define en el periodo (`Periodo.cumplimientoInicio/Fin`), que puede terminar
  después del periodo. Los objetivos de desarrollo siguen siendo sí/no.
- **Periodo.** Borrador → Abierto → Cerrado. Abrir exige al menos un seguimiento y
  la franja del % final; cerrar exige que todos los objetivos tengan su %. Ya no
  existe "En evaluación" ni "Pasar a evaluación": la franja lo reemplaza.
- Los seguimientos nunca alimentan la nota ponderada (`calculo-notas.ts`).

### Indicadores de la empresa (nivel corporativo)

Los objetivos corporativos se llaman **indicadores** y funcionan distinto al resto.
Viven en su propia pestaña, **Indicadores** (`/indicadores`), visible para todos.

- **Sin peso.** Solo Cumple / No cumple. `Objetivo.peso` queda en 0 y la cantidad
  ya no es fija en 8.
- **Seguimiento mensual**, sin franjas: un registro por mes calendario con el
  **% acumulado** (0-100) y un comentario (`AvanceIndicador`, ej. "en octubre vamos
  en 60%"). Se puede registrar el mes en curso y completar o corregir meses
  anteriores del periodo, nunca meses futuros; corregir crea una versión nueva.
  Los meses salen del calendario en hora de Bogotá, ver [src/lib/mes.ts](src/lib/mes.ts).
- **Resultado final.** Al final, quien encarga marca Cumple o No cumple
  (`Objetivo.cumplido`), solo dentro de la franja del % de cumplimiento del periodo.
  Un periodo no se cierra mientras algún indicador no tenga resultado.
- **Quién los gestiona.** El rol *Gestor de objetivos corporativos* (hoy Andrea
  Jimenez Fandiño) carga los indicadores, hace el seguimiento mensual y marca el
  resultado; Gestión Humana y Admin pueden hacer lo mismo. Todos los demás los ven
  en solo lectura. La pantalla muestra como responsables a quienes tengan ese rol.
- **Nota final.** Cómo cuentan los indicadores en el 30% corporativo de la nota
  está sin definir; `calculo-notas.ts` no se tocó y sigue sin conectarse a nada.
- Los registros de seguimiento viejos de objetivos corporativos (los del modelo
  anterior de franjas) siguen en la tabla `registros_seguimiento`, pero ya no se
  muestran.

## Módulo "Mis objetivos" (fase 4, primera entrega)

Pantalla del colaborador: ve sus objetivos individuales, los 2 de su gerencia
y los 8 corporativos (estos dos últimos en solo lectura), con semáforo de
avance vs. tiempo transcurrido del periodo, y puede reportar su propio avance
individual en el corte vigente.

- **[src/server/services/objetivos.service.ts](src/server/services/objetivos.service.ts)**
  arma el modelo de vista completo en 4 consultas (una por nivel + el corte
  vigente), usando `include: { seguimientos: { take: 1, orderBy: [...] } }`
  para traer directamente el último seguimiento vigente por objetivo, sin
  agrupar en JS.
- **[src/server/services/semaforo.ts](src/server/services/semaforo.ts)** es
  una función pura (con tests) que compara avance vs. tiempo transcurrido del
  periodo: verde si va a la par (hasta -5 puntos de holgura), amarillo entre
  -5 y -20, rojo por debajo de -20.
- **Reportar avance** es un flujo completo: diálogo nativo (`<dialog>`) en un
  Client Component, Server Action con validación Zod
  ([seguimiento.schema.ts](src/server/validations/seguimiento.schema.ts)),
  y [seguimientos.service.ts](src/server/services/seguimientos.service.ts)
  que aplica las reglas de negocio: solo el dueño del objetivo puede
  reportar, solo sobre el corte vigente, y solo si no hay ya un reporte
  pendiente de validación para ese corte (si el jefe lo devolvió, sí se
  puede volver a reportar — crea una nueva `version`, nunca sobrescribe).
- Los objetivos de gerencia y corporativos se muestran en solo lectura,
  con quién registró el último avance.
- **Proponer objetivos individuales:** cuando el colaborador todavía no tiene
  objetivos individuales para el periodo (o su conjunto anterior fue
  devuelto), en vez del mensaje vacío se muestra
  [ProponerObjetivosForm.tsx](src/app/(dashboard)/mis-objetivos/ProponerObjetivosForm.tsx):
  filas dinámicas (mínimo 4, sin máximo), con el mismo
  `distribuirPesoEquitativo` del motor de cálculo reutilizado tal cual en el
  cliente (es una función pura, sin dependencias de servidor, así que
  importarla en un Client Component no duplica la lógica). El envío llama
  directamente a la Server Action como función async (no via `<form action>`,
  porque el payload es un arreglo estructurado, no campos planos de
  `FormData`) y crea todos los objetivos en un solo `$transaction` en estado
  `PENDIENTE_APROBACION`.
- **[src/components/ReportarAvanceDialog.tsx](src/components/ReportarAvanceDialog.tsx)**
  es el diálogo de reporte de avance, compartido con "Mi gerencia": recibe la
  Server Action como prop, así que la única diferencia entre reportar un
  objetivo individual y uno de gerencia es a qué función se conecta, no el
  formulario en sí (se movió aquí desde `mis-objetivos/` cuando "Mi gerencia"
  necesitó exactamente lo mismo).

## Módulo "Mi equipo" (fase 4, segunda entrega)

Pantalla del jefe: lista a sus colaboradores directos (`Usuario.jefeId`) para
el periodo vigente.

- Si un colaborador tiene objetivos `PENDIENTE_APROBACION`, se muestran como
  conjunto con dos acciones: **Aprobar objetivos** o **Devolver** (con
  comentario obligatorio). Es una aprobación de todo el conjunto a la vez, no
  objetivo por objetivo — porque los pesos se validan como conjunto
  (`validarObjetivosIndividuales`, la misma función del motor de cálculo, se
  reutiliza aquí también como chequeo defensivo antes de aprobar).
- Si están `APROBADO`, se muestra cada objetivo con su último seguimiento: si
  está `REPORTADO`, aparecen **Validar avance** / **Devolver**; si ya fue
  `VALIDADO` o `DEVUELTO`, se muestra el estado y el comentario.
- [equipo.service.ts](src/server/services/equipo.service.ts) arma esta vista;
  [aprobaciones.service.ts](src/server/services/aprobaciones.service.ts)
  contiene `proponerObjetivosIndividuales` / `aprobarObjetivosIndividuales` /
  `devolverObjetivosIndividuales`; `validarSeguimiento` /
  `devolverSeguimiento` se agregaron a
  [seguimientos.service.ts](src/server/services/seguimientos.service.ts).
- Se corrigió además un vacío real que tenía "Mis objetivos": nada impedía
  reportar avance sobre un objetivo que aún no estaba `APROBADO`
  (`reportarAvanceIndividual` ahora lo valida).
- **Pendiente para una próxima entrega:** "calificar al cierre" (asignar
  `Objetivo.calificacionFinal` cuando el periodo pasa a `EN_EVALUACION`) no
  está construido todavía — el campo ya existe en el esquema desde la fase 2,
  pero la UI de calificación se hace más sentido junto con el cierre de
  periodo (que es responsabilidad de Administración/Gestión Humana).

## Módulo "Mi gerencia" (fase 4, tercera entrega)

Pantalla del gerente: sus 2 objetivos de gerencia + un consolidado de su
equipo.

- **Cargar los 2 objetivos:** a diferencia de los individuales, los de
  gerencia no pasan por aprobación — el gerente los carga y quedan vigentes
  de una vez (`crearObjetivosGerencia`), con peso fijo en 15% cada uno. Solo
  se permite cargarlos una vez por periodo; no hay todavía una vía de edición
  si hace falta corregirlos (queda anotado como pendiente).
- **Reportar avance:** mismo mecanismo que a nivel individual —
  `reportarAvanceGerencia` en
  [seguimientos.service.ts](src/server/services/seguimientos.service.ts),
  que ahora comparte con la versión individual el núcleo de "crear la
  siguiente versión del seguimiento" (`crearSiguienteVersionSeguimiento`),
  extraído en este refactor para no duplicar esa lógica entre niveles.
- **Consolidado del equipo:** por cada colaborador de la gerencia (excepto el
  propio gerente) se muestra cuántos objetivos individuales tiene
  aprobados/pendientes, su avance promedio, y la distribución de semáforo
  (verde/amarillo/rojo) de sus últimos reportes — es una vista operativa de
  un vistazo, no la nota final (que depende de `calificacionFinal`, que
  todavía no se asigna en ningún módulo).
- [gerencia.service.ts](src/server/services/gerencia.service.ts) arma toda
  esta vista.

## Módulo "Administración" (fase 4, cuarta entrega — parcial)

Pantalla de Gestión Humana / Admin: objetivos corporativos y gestión de
periodos. La estructura organizacional (altas de usuarios, gerencias, roles)
quedó fuera **a propósito**: en gran parte la va a resolver el script de
migración de la fase 5 con datos reales de SharePoint, así que construir un
CRUD manual completo ahora habría sido, en parte, trabajo desechable.

- **Objetivos corporativos:** mismo patrón que gerencia — sin aprobación,
  carga única por periodo, 3.75% fijo cada uno
  (`crearObjetivosCorporativos`), reportado por Gestión Humana/Admin
  (`reportarAvanceCorporativo`, que también reutiliza
  `crearSiguienteVersionSeguimiento`).
- **Periodos:** crear periodo (`crearPeriodo`), definir cortes mientras está
  en borrador (`agregarCorte` — ya no se pueden agregar una vez abierto, para
  no generar inconsistencias con lo ya reportado), y las transiciones de
  estado `abrirPeriodo` → `pasarPeriodoAEvaluacion` → `cerrarPeriodo`. Todo
  esto vive en [periodos.service.ts](src/server/services/periodos.service.ts).
- **Regla de negocio real, no solo de UI:** `abrirPeriodo` exige al menos un
  corte definido, y **bloquea la apertura si ya hay otro periodo
  `ABIERTO`/`EN_EVALUACION`** — necesario porque `obtenerPeriodoActual()` (la
  función que usan todos los demás módulos para saber "cuál es el periodo
  vigente") asume que solo hay uno activo a la vez. Verificado en vivo:
  crear un segundo periodo y tratar de abrirlo mientras el primero seguía
  activo se rechazó con el mensaje correcto; cerrando el primero, el segundo
  sí abrió.
- **Bug real encontrado y corregido en esta entrega:** las fechas
  (`fechaInicio`, `fechaFin`, `fechaLimite`, ...) se mostraban un día antes
  del valor real (ej. "30 de jun" en vez de "1 de jul"). Causa: se guardan
  como medianoche UTC, y `Intl.DateTimeFormat` sin `timeZone` explícito usa
  la zona horaria local del servidor (America/Bogota, UTC-5), retrocediendo
  la fecha al formatear. Ya estaba duplicado en 5 archivos, así que además de
  corregirlo se centralizó en
  [src/lib/fecha.ts](src/lib/fecha.ts) (con `timeZone: "UTC"` fijo) — un solo
  lugar de ahora en adelante para formatear estas fechas de calendario.
- También se centralizó `BotonAccionSimple` /
  `DialogDevolverConComentario` en
  [src/components/AccionesSimples.tsx](src/components/AccionesSimples.tsx)
  (antes solo en "Mi equipo", ahora también los usa "Administración" para
  abrir/cerrar periodos).
- **Pendiente, explícitamente fuera de esta entrega:** administrar usuarios,
  gerencias y roles manualmente; exportar a Excel/PDF. Tampoco hay todavía
  una vía para corregir los objetivos de gerencia/corporativos una vez
  cargados (mismo pendiente anotado en la sección de Mi gerencia).

## Módulo "Tablero de resultados" (fase 4, quinta y última entrega)

Pantalla de solo lectura para Gestión Humana/Admin: avance global, cumplimiento
por gerencia, y objetivos en riesgo.

- **Es avance operativo, no la nota final:** el motor de cálculo de notas
  (`calcularPonderadoNivel`) pondera por `calificacionFinal`, que todavía no
  se asigna en ningún módulo. Este tablero pondera por `porcentajeAvance`
  (el último % reportado) con la misma lógica de ponderación por peso, pero
  es deliberadamente una función aparte
  (`promedioPonderadoAvance` en
  [resultados.service.ts](src/server/services/resultados.service.ts)) — no
  se reutiliza el motor de cálculo porque mide algo distinto (avance en
  curso vs. nota de cierre), y mezclar ambos habría sido engañoso. El
  tablero lo deja explícito con una nota visible en pantalla.
- **Cumplimiento por gerencia:** por cada gerencia, cuántos colaboradores ya
  tienen objetivos individuales cargados, su avance promedio ponderado, y la
  distribución de semáforo de sus últimos reportes.
- **Objetivos en riesgo:** todos los objetivos (individual, gerencia,
  corporativo) cuyo semáforo no es verde, ordenados por severidad (rojo
  primero, luego amarillo por avance ascendente) — una lista de atención
  prioritaria de un vistazo.
- Verificado en vivo: las cifras del tablero coinciden exactamente con los
  datos de seed (avance individual 35.5% = el mismo promedio verificado en
  "Mi gerencia"; 1 solo objetivo en riesgo, el mismo que aparece "En riesgo"
  en "Mis objetivos" de Cristian).

## Módulo "Estructura organizacional" (bajo Administración)

Gerencias, colaboradores, y la conexión de cada uno con su jefe directo —
la pieza que antes quedó deliberadamente fuera de la primera entrega de
Administración, hasta que hizo falta de verdad.

- **Pre-registro + vinculación por correo en el primer login:** dar de alta
  a alguien (`crearUsuario`) no requiere su `entraObjectId` — ese campo del
  esquema es nullable justamente para esto (ver la decisión técnica
  correspondiente más arriba). `resolverUsuarioParaLogin`
  ([usuarios.service.ts](src/server/services/usuarios.service.ts)) es lo que
  hace el emparejamiento real la primera vez que esa persona entra por SSO.
- **Editar la conexión jefe/gerencia** (`actualizarUsuario` en
  [organizacion.service.ts](src/server/services/organizacion.service.ts)) es
  el corazón del módulo: cambiar de quién depende un colaborador, a qué
  gerencia pertenece, qué roles tiene, o desactivarlo.
- **Dos validaciones de integridad real, no solo de formulario:**
  - Prevención de ciclos en la cadena de jefes: antes de asignar un jefe se
    camina la cadena hacia arriba desde el jefe propuesto; si en algún punto
    se llega de vuelta al colaborador que se está editando, se rechaza (ej.
    no se puede hacer a alguien jefe de su propio jefe).
  - No se puede desactivar a alguien que sigue siendo gerente de una gerencia
    activa, ni a alguien que todavía tiene colaboradores activos reportándole
    — hay que reasignar primero.
- **Asignar gerente** (`asignarGerente`) le da el rol `GERENTE` a quien se
  asigna, como parte de la misma operación — no es un paso manual aparte que
  se pueda olvidar.
- Verificado en vivo, incluyendo los casos negativos, no solo el camino
  feliz: se dio de alta a un colaborador nuevo (quedó "pendiente de primer
  login"), se intentó crear un ciclo de jefes (rechazado con el mensaje
  correcto), se intentó desactivar a la gerente de la única gerencia
  (rechazado con el mensaje correcto), se reasignó el jefe de alguien
  (aceptado), y se simuló su primer login (el badge "pendiente" desapareció
  y pudo usar la app con normalidad).
- **Bug de UX encontrado y corregido en el camino:** el diálogo de edición no
  reiniciaba sus campos al reabrirse, así que cancelar una edición y volver a
  abrir el diálogo mostraba los cambios abandonados de la vez anterior en vez
  del estado real guardado. Se corrigió reseteando el formulario explícitamente
  cada vez que se abre.
- `prisma/seed.ts` también se hizo completamente idempotente en esta entrega:
  antes, un `upsert` con `update: {}` en usuarios/periodos/cortes significaba
  que una prueba manual (desactivar a alguien, cambiar un periodo de estado)
  dejaba el seed "contaminado" para siempre. Ahora cada upsert restaura
  explícitamente todos los campos relevantes, roles incluidos.

## Datos de ejemplo para desarrollo local

`prisma/seed.ts` ya no inventa personas ni gerencias — esa estructura la trae
la migración real (`scripts/migracion-sharepoint/importar-estructura-real.mjs`)
contra el directorio de Entra ID. El seed solo crea lo mínimo para arrancar un
ambiente nuevo: la cuenta de arranque de Gestión Humana/Admin, el periodo
anual `2026` con 4 seguimientos con franja y la franja del % de cumplimiento. No crea indicadores de la
empresa: los carga el Gestor corporativo desde la pestaña Indicadores. Es idempotente, se puede correr varias
veces:

```bash
npx prisma db seed
```

Como todavía no hay App Registration de Entra ID conectado, para iniciar
sesión sin Microsoft mientras tanto existe el login de solo-desarrollo que se
explica justo abajo.

## Iniciar sesión sin Microsoft en desarrollo

`src/auth.ts` registra un segundo provider (`Credentials`, id `dev-login`)
**únicamente cuando `NODE_ENV !== "production"`** — la condición está en el
propio arreglo `providers`, así que en una build de producción ese código ni
siquiera se registra. Deja entrar como cualquier `Usuario` activo de la base
de datos sin pasar por Microsoft, seleccionándolo de un desplegable que
aparece en `/login` bajo "Solo desarrollo — sin Microsoft" (usa
`db.usuario.findMany` para listar los usuarios de prueba, así que solo
aparece si ya corriste el seed).

Se mantiene a propósito en el código, no es un descarte de un experimento:
sirve para probar cada módulo nuevo como un usuario con el rol que le
corresponde (jefe, gerente, Gestión Humana) sin depender de tener el App
Registration de Entra ID ya configurado — algo que se repetirá en el resto
de la fase 4 (Mi equipo, Mi gerencia, Administración). El requisito de "solo
SSO corporativo, sin usuarios propios" sigue cumpliéndose en producción
porque el guard de `NODE_ENV` es incondicional. Si de todas formas prefieres
que no exista ni siquiera detrás de ese guard, se puede quitar sin afectar
nada más — avísame.

## Configurar el App Registration en Entra ID (requisito de la fase 3)

Antes de poder iniciar sesión de verdad hace falta crear el registro de la
aplicación en el tenant de Microsoft 365 de la organización:

1. Azure Portal → Microsoft Entra ID → App registrations → New registration.
2. **Supported account types:** "Accounts in this organizational directory
   only (single tenant)" — esto es lo que garantiza que solo el personal de
   la empresa pueda autenticarse.
3. **Redirect URI:** tipo Web,
   `https://<tu-dominio>/api/auth/callback/microsoft-entra-id` (y
   `http://localhost:3000/api/auth/callback/microsoft-entra-id` para
   desarrollo local).
4. En "Certificates & secrets", crear un client secret.
5. Completar en `.env`:
   - `AUTH_MICROSOFT_ENTRA_ID_ID` = Application (client) ID
   - `AUTH_MICROSOFT_ENTRA_ID_SECRET` = el client secret generado
   - `AUTH_MICROSOFT_ENTRA_ID_ISSUER` =
     `https://login.microsoftonline.com/<Directory (tenant) ID>/v2.0`
   - `AUTH_SECRET` = generar con `npx auth secret`
6. **Restringir quién puede siquiera intentar entrar, a nivel de Entra ID**
   (recomendado en vez de dejarlo abierto a todo el tenant):
   - Azure Portal → Microsoft Entra ID → **Enterprise applications** → busca
     la misma app (aparece automáticamente al crear el App Registration).
   - **Properties** → **"Assignment required?"** = **Yes** → Guardar. Sin
     esto, cualquier cuenta del tenant puede llegar a la pantalla de login
     de la app (aunque nuestro código igual la rechace si no corresponde).
   - **Users and groups** → **Add user/group** → asigna el grupo de
     seguridad que representa a los colaboradores activos de la
     organización (ej. "Empleados Activos").
   - **API permissions** → botón **"Grant admin consent for
     [organización]"** — sin esto, cada usuario nuevo ve una pantalla de
     "Se necesita la aprobación del administrador" en su primer intento.
7. Con eso, **cualquier miembro de ese grupo ya puede iniciar sesión sin que
   Gestión Humana tenga que darlo de alta a mano primero** — ver
   "Auto-aprovisionamiento en el primer login" más arriba. Si en cambio
   prefieres pre-registrar a alguien con su jefe/gerencia ya definidos antes
   de su primer login, hazlo en **Administración → Estructura
   organizacional** con su correo corporativo real — se vinculará en vez de
   crear un perfil nuevo.

## Problemas conocidos de red (proxy/firewall con inspección TLS)

En algunas redes corporativas (fue el caso durante el desarrollo de esta
app), Node.js falla al conectarse a `login.microsoftonline.com` con
`TypeError: fetch failed` / `ECONNRESET`, mientras que `curl` y los
navegadores normales sí funcionan. La causa: un proxy/firewall intermedio
hace inspección TLS y fuerza una renegociación que el stack TLS 1.3 de Node
no completa correctamente; herramientas que usan el almacén de certificados
de Windows (SChannel) —como `curl` o los navegadores— no tienen el problema.

**Síntoma:** el botón "Iniciar sesión con Microsoft" no hace nada, o el
servidor registra `[auth][error] TypeError: fetch failed` en la consola.

**Solución aplicada:** forzar TLS 1.2 como versión máxima en el proceso de
Node vía la variable de entorno `NODE_OPTIONS=--tls-max-v1.2`, ya integrada en
los scripts `dev` y `start` de `package.json` (con `cross-env` para que
funcione igual en Windows/Linux/macOS) y en el `Dockerfile`. TLS 1.2 sigue
siendo una versión segura y vigente — esto no es un downgrade de seguridad
real, solo evita la renegociación de TLS 1.3 que esta red en particular no
maneja bien.

Si despliegas en una infraestructura donde este problema no ocurre, puedes
quitar `NODE_OPTIONS=--tls-max-v1.2` de `package.json` y del `Dockerfile` sin
que nada más se vea afectado.

## Cómo correr en local

```bash
npm install
cp .env.example .env   # completar DATABASE_URL y credenciales de Entra ID
npx prisma migrate dev --name init
npx prisma db execute --file prisma/constraints.sql --schema prisma/schema.prisma
npm run dev
```

Con Docker:

```bash
cp .env.example .env
docker compose up --build
```
