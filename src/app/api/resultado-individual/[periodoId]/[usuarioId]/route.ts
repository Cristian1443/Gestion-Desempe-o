import { obtenerUsuarioSesion } from "@/server/auth/rbac";
import { db } from "@/server/db";
import { generarConsolidadoPdf } from "@/server/pdf/consolidado";
import { obtenerConsolidado } from "@/server/services/consolidado.service";
import { puedeVerResultadoDe } from "@/server/services/individuales.service";

// pdfkit lee sus fuentes del disco: necesita el runtime de Node (no el Edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function respuestaTexto(estado: number, mensaje: string) {
  return new Response(mensaje, { status: estado, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

function paraArchivo(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, "-");
}

// Resultado final de UNA persona en PDF: sus metas individuales, los indicadores de
// su gerencia y los de la empresa, con su seguimiento y su resultado. Solo cuando el
// periodo está cerrado, y solo para ella misma, su jefe directo, el gerente de su
// gerencia, la directora y Talento Humano / Admin.
export async function GET(_solicitud: Request, { params }: { params: { periodoId: string; usuarioId: string } }) {
  const usuario = await obtenerUsuarioSesion();
  if (!usuario || !usuario.activo) return respuestaTexto(401, "Inicia sesión para descargar el resultado.");

  if (!(await puedeVerResultadoDe(usuario, params.usuarioId))) {
    return respuestaTexto(403, "No tienes permiso para descargar el resultado de esta persona.");
  }

  const periodo = await db.periodo.findUnique({ where: { id: params.periodoId } });
  if (!periodo) return respuestaTexto(404, "El periodo no existe.");
  if (periodo.estado !== "CERRADO") {
    return respuestaTexto(409, "El resultado solo se puede descargar cuando el periodo está cerrado.");
  }

  const datos = await obtenerConsolidado(periodo.id, { usuarioId: params.usuarioId });
  if (!datos.empleado) return respuestaTexto(404, "La persona no existe.");

  const pdf = await generarConsolidadoPdf(datos);
  const nombreArchivo = `resultado-${paraArchivo(datos.empleado.nombre)}-${paraArchivo(periodo.nombre)}.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
