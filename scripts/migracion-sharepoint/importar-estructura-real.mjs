// Importa la estructura organizacional real (gerencias, colaboradores,
// jefes) desde Microsoft Graph, y los objetivos individuales reales desde el
// export de la lista de SharePoint de la app anterior (Power Apps).
//
// Fuente de la verdad para cada cosa:
//   - Correo, cargo, gerencia (department), activo/inactivo, jefe directo:
//     Microsoft Graph (v1.0/users), NUNCA la planilla — la planilla tiene
//     jefes desactualizados, confirmado comparando ambas fuentes.
//   - Objetivos individuales (título, descripción, indicador, peso):
//     la planilla de SharePoint, porque Graph no tiene esa información.
//
// Requiere en .env/.env.local: AUTH_MICROSOFT_ENTRA_ID_ID,
// AUTH_MICROSOFT_ENTRA_ID_SECRET, AUTH_MICROSOFT_ENTRA_ID_ISSUER (para
// derivar el tenant), y que el App Registration tenga el permiso de
// Application "User.Read.All" de Microsoft Graph con consentimiento de
// administrador otorgado.
//
// Idempotente: usa upsert por correo en todo. Se puede correr varias veces
// sin duplicar nada; vuelve a traer el estado más reciente del directorio
// cada vez.
//
// Uso: node --env-file=.env.local scripts/migracion-sharepoint/importar-estructura-real.mjs <ruta-al-excel>

import xlsx from "xlsx";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const rutaExcel = process.argv[2];
if (!rutaExcel) {
  console.error("Uso: node importar-estructura-real.mjs <ruta-al-archivo-excel-de-sharepoint>");
  process.exit(1);
}

const TENANT_ID = new URL(process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER).pathname.split("/")[1];
const CLIENT_ID = process.env.AUTH_MICROSOFT_ENTRA_ID_ID;
const CLIENT_SECRET = process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET;

// --- Las 6 gerencias reales de la organización (nombre de `department` en
// Entra ID -> correo real de quien la gerencia). No es un descubrimiento
// automático porque el título de cargo por sí solo no basta para saber quién
// es el gerente formal (ej. interinos, "(E)"); se confirmó a mano contra el
// directorio real antes de escribir este script. ---
const GERENCIAS_REALES = [
  { nombre: "Dirección Ejecutiva", gerenteCorreo: "iduran@investinbogota.org" },
  { nombre: "Gerencia Administrativa y Financiera", gerenteCorreo: "jsanz@investinbogota.org" },
  { nombre: "Gerencia Bureau de Convenciones", gerenteCorreo: "lvasquez@investinbogota.org" },
  { nombre: "Gerencia de Estrategia y Competitividad", gerenteCorreo: "ptamara@investinbogota.org" },
  { nombre: "Gerencia Mercadeo y Comunicaciones", gerenteCorreo: "ltibaduisa@investinbogota.org" },
  { nombre: "Gerencia Promoción de Inversión", gerenteCorreo: "jmarquez@investinbogota.org" },
];

// Personas activas cuyo `department` en Entra ID viene vacío, pero que por
// cargo/contexto pertenecen a una de las gerencias reales.
const GERENCIA_MANUAL = {
  "ctamayo@investinbogota.org": "Gerencia Promoción de Inversión",
  "vcardenas@investinbogota.org": "Gerencia Promoción de Inversión",
};

// Jefes mencionados en la planilla que no representan una relación real de
// jefatura (cuenta genérica de administración del sistema anterior).
const JEFES_A_IGNORAR = new Set(["iib services 2"]);

// La planilla anterior (Power Apps) traía "Linea_Estrategica" con el texto
// completo de la línea (ej. "L5: Transversal - sostenibilidad operativa.");
// aquí solo nos interesa el código para guardarlo en el enum de Prisma.
function codigoLinea(textoLinea) {
  const match = String(textoLinea || "").match(/^L([1-5])\b/i);
  return match ? `L${match[1]}` : null;
}

const LARGO_TITULO = 100;

// No hay un campo de "título" en el formulario real — se deriva de la
// descripción para tener un encabezado corto en tarjetas y listas (igual que
// `derivarTitulo` en aprobaciones.service.ts).
function derivarTitulo(descripcion) {
  const texto = String(descripcion).trim();
  return texto.length > LARGO_TITULO ? `${texto.slice(0, LARGO_TITULO - 1)}…` : texto;
}

// Reescala un grupo de pesos para que sume exactamente `totalObjetivo`,
// preservando la proporción original entre ellos. Reparte en centésimos y
// absorbe el residuo de redondeo en el último elemento, igual que
// `distribuirPesoEquitativo` en el motor de cálculo — así nunca choca contra
// el CHECK constraint de suma exacta por imprecisión de punto flotante.
function reescalarPesos(pesosOriginales, totalObjetivo) {
  const sumaOriginal = pesosOriginales.reduce((a, b) => a + b, 0);
  if (sumaOriginal === 0) return pesosOriginales.map(() => 0);

  const totalCentesimos = Math.round(totalObjetivo * 100);
  const centesimos = pesosOriginales.map((p) => Math.round((p / sumaOriginal) * totalCentesimos));
  const diferencia = totalCentesimos - centesimos.reduce((a, b) => a + b, 0);
  centesimos[centesimos.length - 1] += diferencia;

  return centesimos.map((c) => c / 100);
}

const REPORTE = {
  gerenciasCreadas: [],
  usuariosCreados: [],
  usuariosActualizados: [],
  objetivosCreados: 0,
  omitidos: [],
  advertencias: [],
};

function normalizar(nombre) {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function obtenerTokenGraph() {
  const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default",
    }),
  });
  const datos = await res.json();
  if (!res.ok) throw new Error(`No se pudo autenticar con Graph: ${JSON.stringify(datos)}`);
  return datos.access_token;
}

async function listarUsuariosGraph(token) {
  const usuarios = [];
  let url =
    "https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName,jobTitle,department,accountEnabled&$top=999";
  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const datos = await res.json();
    if (!res.ok) throw new Error(`Error de Graph: ${JSON.stringify(datos)}`);
    usuarios.push(...datos.value);
    url = datos["@odata.nextLink"] ?? null;
  }
  return usuarios;
}

async function obtenerManagerGraph(token, userId) {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${userId}/manager?$select=id,displayName,mail,userPrincipalName`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (res.status === 404) return null;
  const datos = await res.json();
  if (!res.ok) return null;
  return datos;
}

function leerPlanilla(ruta) {
  const libro = xlsx.readFile(ruta);
  const hoja = libro.Sheets[libro.SheetNames[0]];
  return xlsx.utils.sheet_to_json(hoja, { defval: "" });
}

async function main() {
  console.log("Autenticando con Microsoft Graph...");
  const token = await obtenerTokenGraph();

  console.log("Descargando directorio completo...");
  const usuariosGraph = await listarUsuariosGraph(token);
  const porNombreNormalizado = new Map(
    usuariosGraph.filter((u) => u.displayName).map((u) => [normalizar(u.displayName), u]),
  );
  const porCorreo = new Map(
    usuariosGraph.map((u) => [(u.mail || u.userPrincipalName || "").toLowerCase(), u]),
  );

  console.log("Leyendo planilla de objetivos...");
  const filas = leerPlanilla(rutaExcel);

  const nombresPlanilla = new Set();
  const filasPorEmpleado = new Map();
  for (const fila of filas) {
    const empleado = String(fila["Empleado"]).trim();
    if (!empleado) continue;
    nombresPlanilla.add(empleado);
    if (!filasPorEmpleado.has(empleado)) filasPorEmpleado.set(empleado, []);
    filasPorEmpleado.get(empleado).push(fila);

    const jefe = String(fila["Jefe Directo"]).trim();
    if (jefe && !JEFES_A_IGNORAR.has(normalizar(jefe))) nombresPlanilla.add(jefe);
  }
  // Jefes reales que no aparecen en la planilla, pero sí son manager de
  // alguien en Entra ID (se agregan luego de resolver managers, ver abajo).

  // --- Paso 1: crear las 6 gerencias reales (sin gerente todavía) ---
  const gerenciaIdPorNombre = new Map();
  for (const g of GERENCIAS_REALES) {
    const creada = await db.gerencia.upsert({
      where: { nombre: g.nombre },
      update: {},
      create: { nombre: g.nombre },
    });
    gerenciaIdPorNombre.set(g.nombre, creada.id);
    REPORTE.gerenciasCreadas.push(g.nombre);
  }

  // --- Paso 2: eliminar la gerencia ficticia "Transformación Digital" ---
  const gerenciaFicticia = await db.gerencia.findUnique({ where: { nombre: "Transformación Digital" } });
  if (gerenciaFicticia) {
    await db.objetivo.deleteMany({ where: { nivel: "GERENCIA", gerenciaId: gerenciaFicticia.id } });
    await db.usuario.updateMany({
      where: { gerenciaId: gerenciaFicticia.id },
      data: { gerenciaId: null },
    });
    await db.gerencia.delete({ where: { id: gerenciaFicticia.id } });
    REPORTE.advertencias.push('Gerencia ficticia "Transformación Digital" eliminada (con sus objetivos de prueba).');
  }

  // --- Paso 2b: eliminar al colaborador ficticio "Andrés Felipe Torres" ---
  const ficticioAndres = await db.usuario.findUnique({
    where: { email: "andres.torres@investinbogota.org" },
  });
  if (ficticioAndres) {
    await db.usuario.delete({ where: { id: ficticioAndres.id } });
    REPORTE.advertencias.push('Usuario ficticio "Andrés Felipe Torres" eliminado.');
  }

  // --- Paso 2c: limpiar los objetivos individuales ficticios de Cristian
  // (usuario real ya vinculado por login, pero sus 4 objetivos eran
  // contenido de prueba inventado, no sus objetivos reales) ---
  const cristian = await db.usuario.findUnique({ where: { email: "creyes@investinbogota.org" } });
  if (cristian) {
    const borrados = await db.objetivo.deleteMany({
      where: { nivel: "INDIVIDUAL", usuarioId: cristian.id },
    });
    if (borrados.count > 0) {
      REPORTE.advertencias.push(
        `Se eliminaron ${borrados.count} objetivos individuales ficticios de Cristian Johan Reyes — no aparece en la planilla real, así que verá el formulario para proponer los suyos.`,
      );
    }
  }

  // --- Paso 3: resolver cada nombre de la planilla contra Graph ---
  const resueltos = []; // { graph, filasObjetivos }
  for (const nombre of nombresPlanilla) {
    const match = porNombreNormalizado.get(normalizar(nombre));
    if (!match) {
      REPORTE.omitidos.push(`"${nombre}" — no encontrado en el directorio de Entra ID`);
      continue;
    }
    resueltos.push({ graph: match, filasObjetivos: filasPorEmpleado.get(nombre) ?? [] });
  }

  // Personas reales que no estaban en la planilla pero sí deben quedar con
  // su gerencia/jefe reales: los 6 gerentes (algunos no reportan sus propios
  // objetivos en esta lista) y quien ya inició sesión de verdad en la app.
  for (const correo of new Set([
    ...GERENCIAS_REALES.map((g) => g.gerenteCorreo),
    "creyes@investinbogota.org",
  ])) {
    if (!resueltos.some((r) => (r.graph.mail || "").toLowerCase() === correo)) {
      const match = porCorreo.get(correo);
      if (match) resueltos.push({ graph: match, filasObjetivos: [] });
    }
  }

  // --- Paso 4: crear/actualizar cada Usuario (sin jefeId todavía) ---
  const usuarioIdPorCorreo = new Map();
  for (const { graph } of resueltos) {
    const correo = (graph.mail || graph.userPrincipalName || "").toLowerCase();
    if (!correo) {
      REPORTE.omitidos.push(`"${graph.displayName}" — sin correo en el directorio`);
      continue;
    }

    let gerenciaId = null;
    if (graph.department && gerenciaIdPorNombre.has(graph.department)) {
      gerenciaId = gerenciaIdPorNombre.get(graph.department);
    } else if (GERENCIA_MANUAL[correo]) {
      gerenciaId = gerenciaIdPorNombre.get(GERENCIA_MANUAL[correo]);
    }

    const existente = await db.usuario.findUnique({ where: { email: correo } });
    const datos = {
      nombre: graph.displayName,
      cargo: graph.jobTitle || null,
      activo: graph.accountEnabled,
      gerenciaId,
    };

    let usuario;
    if (existente) {
      usuario = await db.usuario.update({ where: { id: existente.id }, data: datos });
      REPORTE.usuariosActualizados.push(correo);
    } else {
      usuario = await db.usuario.create({
        data: { ...datos, email: correo, roles: { create: [{ rol: "COLABORADOR" }] } },
      });
      REPORTE.usuariosCreados.push(correo);
    }
    usuarioIdPorCorreo.set(correo, usuario.id);
  }

  // --- Paso 5: segunda pasada — asignar jefeId usando el manager real de
  // Graph, solo si ese manager quedó creado y está activo. ---
  for (const { graph } of resueltos) {
    const correo = (graph.mail || graph.userPrincipalName || "").toLowerCase();
    const usuarioId = usuarioIdPorCorreo.get(correo);
    if (!usuarioId) continue;

    const manager = await obtenerManagerGraph(token, graph.id);
    if (!manager || manager.id === graph.id) continue; // sin jefe, o auto-referencia (tope del organigrama)

    const correoJefe = (manager.mail || manager.userPrincipalName || "").toLowerCase();
    const jefeId = usuarioIdPorCorreo.get(correoJefe);
    if (!jefeId) {
      REPORTE.advertencias.push(
        `${graph.displayName}: su jefe real (${manager.displayName}) no quedó creado en el sistema — probablemente está inactivo. Queda sin jefe asignado.`,
      );
      continue;
    }

    await db.usuario.update({ where: { id: usuarioId }, data: { jefeId } });

    // Ser el jefe real de alguien (según Entra ID) debe traer consigo el rol
    // JEFE en el sistema — si no, esa persona no podría entrar a "Mi
    // equipo" a aprobar los objetivos de quien le reporta.
    await db.usuarioRol.upsert({
      where: { usuarioId_rol: { usuarioId: jefeId, rol: "JEFE" } },
      update: {},
      create: { usuarioId: jefeId, rol: "JEFE" },
    });
  }

  // El correo "gestionhumana@" es el buzón real de Recursos Humanos — quien
  // sea que lo tenga asignado hoy debe poder administrar el sistema.
  const gestionHumanaId = usuarioIdPorCorreo.get("gestionhumana@investinbogota.org");
  if (gestionHumanaId) {
    await db.usuarioRol.upsert({
      where: { usuarioId_rol: { usuarioId: gestionHumanaId, rol: "GESTION_HUMANA" } },
      update: {},
      create: { usuarioId: gestionHumanaId, rol: "GESTION_HUMANA" },
    });
  }

  // --- Paso 6: asignar gerente a cada gerencia (+ rol GERENTE) ---
  for (const g of GERENCIAS_REALES) {
    const gerenteId = usuarioIdPorCorreo.get(g.gerenteCorreo);
    if (!gerenteId) {
      REPORTE.advertencias.push(`No se pudo asignar gerente a "${g.nombre}" (${g.gerenteCorreo} no resuelto).`);
      continue;
    }
    await db.gerencia.update({ where: { id: gerenciaIdPorNombre.get(g.nombre) }, data: { gerenteId } });
    await db.usuarioRol.upsert({
      where: { usuarioId_rol: { usuarioId: gerenteId, rol: "GERENTE" } },
      update: {},
      create: { usuarioId: gerenteId, rol: "GERENTE" },
    });
  }

  // --- Paso 7: cargar los objetivos individuales reales (periodo 2026,
  // anual) para quienes están activos y tienen exactamente 4 filas de
  // DESEMPEÑO y 2 de DESARROLLO (la estructura real del modelo: 30% + 10% =
  // 40%). Los pesos originales de la planilla (que solían sumar 100 en
  // total, ~90 desempeño + 10 desarrollo) se reescalan proporcionalmente a
  // 30 y 10. ---
  const periodo = await db.periodo.findUnique({ where: { nombre: "2026" } });
  if (!periodo) {
    REPORTE.advertencias.push('No existe el periodo "2026" — no se cargó ningún objetivo individual.');
  } else {
    for (const { graph, filasObjetivos } of resueltos) {
      const correo = (graph.mail || graph.userPrincipalName || "").toLowerCase();
      const usuarioId = usuarioIdPorCorreo.get(correo);
      if (!usuarioId || !graph.accountEnabled) continue;

      const filasDesempeno = filasObjetivos.filter(
        (f) => String(f["Tipo_Objetivo"]).trim() === "Desempeño",
      );
      const filasDesarrollo = filasObjetivos.filter(
        (f) => String(f["Tipo_Objetivo"]).trim() === "Desarrollo",
      );

      if (filasDesempeno.length !== 4 || filasDesarrollo.length !== 2) {
        REPORTE.omitidos.push(
          `Objetivos de ${graph.displayName} no se cargaron: se requieren 4 de desempeño y 2 de ` +
            `desarrollo, tiene ${filasDesempeno.length} y ${filasDesarrollo.length}.`,
        );
        continue;
      }

      const lineasSinCodigo = filasDesempeno.filter((f) => !codigoLinea(f["Linea_Estrategica"]));
      if (lineasSinCodigo.length > 0) {
        REPORTE.omitidos.push(
          `Objetivos de ${graph.displayName} no se cargaron: algún objetivo de desempeño no tiene ` +
            `una línea estratégica reconocible (L1-L5).`,
        );
        continue;
      }

      const yaTiene = await db.objetivo.count({
        where: { periodoId: periodo.id, nivel: "INDIVIDUAL", usuarioId },
      });
      if (yaTiene > 0) continue; // idempotente: no duplicar en corridas repetidas

      const pesosDesempeno = reescalarPesos(
        filasDesempeno.map((f) => Number(f["Peso_Porcentaje"]) || 0),
        30,
      );
      const pesosDesarrollo = reescalarPesos(
        filasDesarrollo.map((f) => Number(f["Peso_Porcentaje"]) || 0),
        10,
      );

      for (const [indice, fila] of filasDesempeno.entries()) {
        const descripcion = String(fila["Descripcion_Detallada"] || fila["Título"]);
        await db.objetivo.create({
          data: {
            periodoId: periodo.id,
            nivel: "INDIVIDUAL",
            usuarioId,
            tipoIndividual: "DESEMPENO",
            lineaEstrategica: codigoLinea(fila["Linea_Estrategica"]),
            titulo: derivarTitulo(descripcion),
            descripcion,
            acciones: String(fila["Acciones"] || descripcion),
            indicador: String(fila["Indicadores"] || "Sin indicador registrado"),
            peso: pesosDesempeno[indice],
            linkRepositorio: String(fila["Link_Repositorio"] || "").trim() || null,
            estadoAprobacion: "APROBADO",
            creadoPor: usuarioId,
          },
        });
        REPORTE.objetivosCreados++;
      }

      for (const [indice, fila] of filasDesarrollo.entries()) {
        if (!fila["Linea_Estrategica"] && !fila["Descripcion_Detallada"]) {
          REPORTE.advertencias.push(
            `${graph.displayName}: un objetivo de desarrollo no traía competencia ni descripción en ` +
              `la planilla original ("${fila["Título"]}") — se cargó con un texto de relleno, hay que ` +
              `pedirle que lo complete.`,
          );
        }
        const descripcion = String(fila["Descripcion_Detallada"] || fila["Título"]);
        await db.objetivo.create({
          data: {
            periodoId: periodo.id,
            nivel: "INDIVIDUAL",
            usuarioId,
            tipoIndividual: "DESARROLLO",
            competencia: String(
              fila["Linea_Estrategica"] ||
                fila["Descripcion_Detallada"] ||
                fila["Título"] ||
                "Sin competencia especificada en la planilla original",
            ).slice(0, 300),
            titulo: derivarTitulo(descripcion),
            descripcion,
            acciones: String(fila["Acciones"] || descripcion),
            indicador: String(fila["Indicadores"] || "Sin indicador registrado"),
            peso: pesosDesarrollo[indice],
            linkRepositorio: String(fila["Link_Repositorio"] || "").trim() || null,
            estadoAprobacion: "APROBADO",
            creadoPor: usuarioId,
          },
        });
        REPORTE.objetivosCreados++;
      }
    }
  }

  console.log("\n=== REPORTE DE MIGRACIÓN ===");
  console.log(JSON.stringify(REPORTE, null, 2));
}

main()
  .catch((err) => {
    console.error("FALLO LA MIGRACIÓN:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
