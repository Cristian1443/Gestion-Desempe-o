import { obtenerUsuarioSesion, tieneRol } from "@/server/auth/rbac";
import { db } from "@/server/db";
import { generarConsolidadoPdf } from "@/server/pdf/consolidado";
import { obtenerConsolidado } from "@/server/services/consolidado.service";

// pdfkit lee sus fuentes del disco: necesita el runtime de Node (no el Edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function respuestaTexto(estado: number, mensaje: string) {
  return new Response(mensaje, { status: estado, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

// Consolidado del periodo en PDF: objetivos individuales, indicadores de gerencia
// e indicadores de la empresa, con su seguimiento y su resultado. Solo Gestión
// Humana y Admin, y solo cuando el periodo ya está cerrado.
export async function GET(_solicitud: Request, { params }: { params: { periodoId: string } }) {
  const usuario = await obtenerUsuarioSesion();
  if (!usuario || !usuario.activo) return respuestaTexto(401, "Inicia sesión para descargar el consolidado.");
  if (!tieneRol(usuario.roles, ["GESTION_HUMANA", "ADMIN"])) {
    return respuestaTexto(403, "Solo Gestión Humana puede descargar el consolidado.");
  }

  const periodo = await db.periodo.findUnique({ where: { id: params.periodoId } });
  if (!periodo) return respuestaTexto(404, "El periodo no existe.");
  if (periodo.estado !== "CERRADO") {
    return respuestaTexto(409, "El consolidado solo se puede descargar cuando el periodo está cerrado.");
  }

  const pdf = await generarConsolidadoPdf(await obtenerConsolidado(periodo.id));
  const nombreArchivo = `consolidado-${periodo.nombre.replace(/[^A-Za-z0-9_-]+/g, "-")}.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
