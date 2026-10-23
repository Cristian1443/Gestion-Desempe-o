import PDFDocument from "pdfkit";
import { formatearFecha } from "@/lib/fecha";
import { etiquetaMes } from "@/lib/mes";
import type {
  ConsolidadoDatos,
  IndicadorEmpresaPdf,
  IndicadorGerenciaPdf,
  IndicadorPdf,
  ObjetivoIndividualPdf,
  PersonaPdf,
  ResumenNivel,
} from "@/server/services/consolidado.service";

// Colores sobrios, con el rojo institucional solo para títulos y acentos.
const ROJO = "#C00000";
const TEXTO = "#262626";
const GRIS = "#6B6B6B";
const LINEA = "#E4E0D8";
const VERDE = "#3F8F5F";
const ROJO_NO = "#A6291D";

const MARGEN = 50;
const ANCHO_UTIL = 595.28 - MARGEN * 2; // A4

// Las fuentes estándar del PDF cubren el español (tildes, ñ, comillas, guion largo)
// pero no emojis ni símbolos raros: se reemplazan por "?" en vez de dejar un hueco.
function limpiar(texto: string | null | undefined): string {
  if (!texto) return "";
  return texto
    .replace(/\r\n/g, "\n")
    .replace(/[^\n -~ -ÿ–—‘’“”•…€]/g, "?");
}

function etiquetaResultado(cumplido: boolean | null): { texto: string; color: string } {
  if (cumplido === true) return { texto: "Cumple", color: VERDE };
  if (cumplido === false) return { texto: "No cumple", color: ROJO_NO };
  return { texto: "Sin resultado", color: GRIS };
}

class Escritor {
  readonly doc: PDFKit.PDFDocument;

  constructor(doc: PDFKit.PDFDocument) {
    this.doc = doc;
  }

  private get limiteInferior(): number {
    return this.doc.page.height - MARGEN - 10;
  }

  // Si lo que sigue no cabe en lo que queda de la página, pasa a una nueva.
  asegurarEspacio(alto: number) {
    if (this.doc.y + alto > this.limiteInferior) this.doc.addPage();
  }

  separador(espacio = 8) {
    this.doc.moveDown(0).y += espacio;
  }

  titulo(texto: string, tamano = 18) {
    this.asegurarEspacio(tamano * 3);
    this.doc.font("Helvetica-Bold").fontSize(tamano).fillColor(ROJO).text(limpiar(texto), MARGEN, this.doc.y, {
      width: ANCHO_UTIL,
    });
    const y = this.doc.y + 3;
    this.doc.moveTo(MARGEN, y).lineTo(MARGEN + ANCHO_UTIL, y).strokeColor(LINEA).lineWidth(1).stroke();
    this.doc.y = y + 8;
  }

  subtitulo(texto: string, color = TEXTO, tamano = 12) {
    this.asegurarEspacio(tamano * 3);
    this.doc.font("Helvetica-Bold").fontSize(tamano).fillColor(color).text(limpiar(texto), MARGEN, this.doc.y, {
      width: ANCHO_UTIL,
    });
    this.doc.moveDown(0.25);
  }

  parrafo(texto: string, opciones: { color?: string; tamano?: number; negrita?: boolean; sangria?: number } = {}) {
    const { color = TEXTO, tamano = 10, negrita = false, sangria = 0 } = opciones;
    const contenido = limpiar(texto);
    if (!contenido) return;
    this.doc.font(negrita ? "Helvetica-Bold" : "Helvetica").fontSize(tamano).fillColor(color);
    const alto = this.doc.heightOfString(contenido, { width: ANCHO_UTIL - sangria });
    this.asegurarEspacio(Math.min(alto, 60) + 2);
    this.doc.text(contenido, MARGEN + sangria, this.doc.y, { width: ANCHO_UTIL - sangria });
    this.doc.moveDown(0.2);
  }

  // "Etiqueta: valor" con la etiqueta en gris.
  campo(etiqueta: string, valor: string | null | undefined, sangria = 0) {
    const contenido = limpiar(valor);
    if (!contenido) return;
    const ancho = ANCHO_UTIL - sangria;
    this.doc.font("Helvetica").fontSize(10);
    const alto = this.doc.heightOfString(`${etiqueta}: ${contenido}`, { width: ancho });
    this.asegurarEspacio(Math.min(alto, 60) + 2);
    this.doc
      .font("Helvetica-Bold")
      .fillColor(GRIS)
      .text(`${etiqueta}: `, MARGEN + sangria, this.doc.y, { width: ancho, continued: true })
      .font("Helvetica")
      .fillColor(TEXTO)
      .text(contenido);
    this.doc.moveDown(0.2);
  }

  resultado(cumplido: boolean | null, sangria = 0) {
    const { texto, color } = etiquetaResultado(cumplido);
    this.asegurarEspacio(16);
    this.doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(GRIS)
      .text("Resultado final: ", MARGEN + sangria, this.doc.y, { continued: true })
      .fillColor(color)
      .text(texto);
    this.doc.moveDown(0.3);
  }
}

function textoResumen(r: ResumenNivel): string[] {
  return [String(r.total), String(r.cumplen), String(r.noCumplen), String(r.sinResultado)];
}

function dibujarPortada(e: Escritor, datos: ConsolidadoDatos) {
  const { doc } = e;
  doc.rect(0, 0, doc.page.width, 150).fill(ROJO);
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#FFFFFF").text("INVEST IN BOGOTÁ", MARGEN, 52, { characterSpacing: 2 });
  doc.font("Helvetica-Bold").fontSize(26).text("Consolidado de la evaluación", MARGEN, 76, { width: ANCHO_UTIL });
  doc.font("Helvetica").fontSize(13).text(limpiar(`Periodo ${datos.periodo.nombre}`), MARGEN, 112);

  doc.y = 180;
  e.campo("Vigencia", `${formatearFecha(datos.periodo.fechaInicio)} al ${formatearFecha(datos.periodo.fechaFin)}`);
  e.campo("Estado del periodo", datos.periodo.estado === "CERRADO" ? "Cerrado" : datos.periodo.estado);
  e.campo("Generado el", formatearFecha(datos.generadoEn));
  e.separador(16);

  e.titulo("Resumen de resultados", 15);
  e.parrafo("Cuántas metas cumplieron, no cumplieron o quedaron sin resultado, por componente de medición.", {
    color: GRIS,
  });
  e.separador(6);

  const columnas = [ANCHO_UTIL - 4 * 85, 85, 85, 85, 85];
  const encabezado = ["Nivel", "Total", "Cumplen", "No cumplen", "Sin resultado"];
  const filas: Array<[string, ResumenNivel]> = [
    ["C1: Metas individuales", datos.resumen.individuales],
    ["C2: Metas por gerencia", datos.resumen.gerencia],
    ["C3: Resultado institucional", datos.resumen.empresa],
  ];

  function fila(valores: string[], opciones: { negrita: boolean; fondo?: string; colores?: Array<string | undefined> }) {
    const y = doc.y;
    const alto = 22;
    if (opciones.fondo) doc.rect(MARGEN, y, ANCHO_UTIL, alto).fill(opciones.fondo);
    let x = MARGEN;
    valores.forEach((valor, i) => {
      doc
        .font(opciones.negrita ? "Helvetica-Bold" : "Helvetica")
        .fontSize(10)
        .fillColor(opciones.colores?.[i] ?? (opciones.negrita ? "#FFFFFF" : TEXTO))
        .text(valor, x + 8, y + 6, { width: columnas[i]! - 16, align: i === 0 ? "left" : "center" });
      x += columnas[i]!;
    });
    doc.moveTo(MARGEN, y + alto).lineTo(MARGEN + ANCHO_UTIL, y + alto).strokeColor(LINEA).lineWidth(0.5).stroke();
    doc.y = y + alto;
  }

  fila(encabezado, { negrita: true, fondo: ROJO });
  for (const [nombre, r] of filas) {
    fila([nombre, ...textoResumen(r)], { negrita: false, colores: [undefined, undefined, VERDE, ROJO_NO, GRIS] });
  }
}

function dibujarIndicadorBase(e: Escritor, indicador: IndicadorPdf, numero: number) {
  e.separador(6);
  e.subtitulo(`${numero}. ${indicador.titulo}`, TEXTO, 11.5);
  e.resultado(indicador.cumplido);
  e.campo("Línea estratégica", indicador.lineaEstrategica);
  e.campo("Objetivo estratégico", indicador.descripcion);
  e.campo("Indicador estratégico", indicador.titulo);
  e.campo("Meta", `${indicador.meta}${indicador.unidadMedida ? ` ${indicador.unidadMedida}` : ""}`);
}

function dibujarEmpresa(e: Escritor, indicadores: IndicadorEmpresaPdf[]) {
  e.doc.addPage();
  e.titulo("Componente 3 (C3): Resultado institucional");
  if (indicadores.length === 0) {
    e.parrafo("No se cargaron indicadores de resultado institucional en este periodo.", { color: GRIS });
    return;
  }
  e.parrafo("Aplican a toda la Corporación. Sin peso: avance acumulado mes a mes y resultado final Cumple / No cumple.", {
    color: GRIS,
  });
  indicadores.forEach((indicador, i) => {
    dibujarIndicadorBase(e, indicador, i + 1);
    if (indicador.avances.length === 0) {
      e.parrafo("Sin avances registrados.", { color: GRIS, sangria: 12 });
    }
    for (const avance of indicador.avances) {
      e.parrafo(`${etiquetaMes(avance.mes)} — ${avance.porcentaje} %: ${avance.comentario}`, { sangria: 12, tamano: 9.5 });
    }
  });
}

function dibujarGerencias(e: Escritor, gerencias: Array<{ nombre: string; gerente: string | null; indicadores: IndicadorGerenciaPdf[] }>) {
  e.doc.addPage();
  e.titulo("Componente 2 (C2): Metas por gerencia");
  if (gerencias.length === 0) {
    e.parrafo("No se cargaron metas por gerencia en este periodo.", { color: GRIS });
    return;
  }
  e.parrafo("Sin peso: avance acumulado en cada seguimiento y resultado final Cumple / No cumple.", { color: GRIS });
  for (const gerencia of gerencias) {
    e.separador(10);
    e.asegurarEspacio(70);
    e.subtitulo(gerencia.nombre, ROJO, 13);
    if (gerencia.gerente) e.campo("Gerente", gerencia.gerente);
    gerencia.indicadores.forEach((indicador, i) => {
      dibujarIndicadorBase(e, indicador, i + 1);
      if (indicador.seguimientos.length === 0) {
        e.parrafo("Sin seguimientos registrados.", { color: GRIS, sangria: 12 });
      }
      for (const s of indicador.seguimientos) {
        const porcentaje = s.porcentaje !== null ? ` — ${s.porcentaje} %` : "";
        e.parrafo(
          `Seguimiento ${s.numero} (${formatearFecha(s.fechaInicio)} al ${formatearFecha(s.fechaFin)})${porcentaje}: ${s.comentario}`,
          { sangria: 12, tamano: 9.5 },
        );
      }
    });
  }
}

function dibujarObjetivo(e: Escritor, objetivo: ObjetivoIndividualPdf, numero: number) {
  e.separador(4);
  e.asegurarEspacio(60);
  e.parrafo(`${numero}. ${objetivo.descripcion}`, { negrita: true, sangria: 8 });
  if (objetivo.lineaEstrategica) e.campo("Línea estratégica", objetivo.lineaEstrategica, 14);
  e.campo("Acciones", objetivo.acciones, 14);
  e.campo("Fórmula del indicador", objetivo.indicador, 14);
  e.campo("Meta", objetivo.meta, 14);
  if (objetivo.peso !== null && objetivo.peso !== undefined) e.campo("Peso", `${objetivo.peso} %`, 14);
  for (const s of objetivo.seguimientos) {
    const avance = s.porcentaje !== null && s.porcentaje !== undefined ? ` — ${s.porcentaje} %` : "";
    e.parrafo(`Seguimiento ${s.numero}${avance}: ${s.comentario}`, { sangria: 14, tamano: 9.5 });
  }
  if (objetivo.calificacionFinal !== null && objetivo.calificacionFinal !== undefined) {
    e.campo("% de cumplimiento", `${objetivo.calificacionFinal} %`, 14);
  }
  e.resultado(objetivo.cumplido, 14);
}

function dibujarIndividuales(e: Escritor, grupos: Array<{ gerencia: string; personas: PersonaPdf[] }>) {
  e.doc.addPage();
  e.titulo("Componente 1 (C1): Metas individuales");
  if (grupos.length === 0) {
    e.parrafo("No hay metas individuales aprobadas en este periodo.", { color: GRIS });
    return;
  }
  e.parrafo("Agrupados por gerencia y por persona. Sin peso: cada objetivo termina en Cumple / No cumple.", { color: GRIS });
  grupos.forEach((grupo, i) => {
    // La primera gerencia sigue en la misma página del título; las demás empiezan una nueva.
    if (i > 0) e.doc.addPage();
    else e.separador(10);
    e.subtitulo(grupo.gerencia, ROJO, 14);
    e.separador(2);
    for (const persona of grupo.personas) {
      const cumplen = persona.objetivos.filter((o) => o.cumplido === true).length;
      e.separador(8);
      e.asegurarEspacio(90);
      e.subtitulo(persona.nombre, TEXTO, 12);
      e.parrafo(
        `${persona.cargo ? `${persona.cargo} · ` : ""}${cumplen} de ${persona.objetivos.length} objetivos cumplen`,
        { color: GRIS, tamano: 9.5 },
      );
      persona.objetivos.forEach((objetivo, j) => dibujarObjetivo(e, objetivo, j + 1));
    }
  });
}

// Pie con el nombre del periodo y el número de página, en todas las páginas menos la portada.
function dibujarPies(doc: PDFKit.PDFDocument, periodo: string) {
  const rango = doc.bufferedPageRange();
  for (let i = 1; i < rango.count; i++) {
    doc.switchToPage(rango.start + i);
    const margenAbajo = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // para poder escribir dentro del margen sin que se cree otra página
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(GRIS)
      .text(limpiar(`Invest in Bogotá · Consolidado ${periodo}`), MARGEN, doc.page.height - 34, {
        width: ANCHO_UTIL / 2,
        lineBreak: false,
      })
      .text(`Página ${i + 1} de ${rango.count}`, MARGEN + ANCHO_UTIL / 2, doc.page.height - 34, {
        width: ANCHO_UTIL / 2,
        align: "right",
        lineBreak: false,
      });
    doc.page.margins.bottom = margenAbajo;
  }
}

export function generarConsolidadoPdf(datos: ConsolidadoDatos): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGEN, bottom: MARGEN, left: MARGEN, right: MARGEN },
      bufferPages: true,
      info: {
        Title: limpiar(`Consolidado de la evaluación — ${datos.periodo.nombre}`),
        Author: "Invest in Bogotá — Gestión del Desempeño",
      },
    });

    const trozos: Buffer[] = [];
    doc.on("data", (t: Buffer) => trozos.push(t));
    doc.on("end", () => resolve(Buffer.concat(trozos)));
    doc.on("error", reject);

    try {
      const e = new Escritor(doc);
      dibujarPortada(e, datos);
      dibujarIndividuales(e, datos.individuales);
      dibujarGerencias(e, datos.gerencias);
      dibujarEmpresa(e, datos.empresa);
      dibujarPies(doc, datos.periodo.nombre);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
