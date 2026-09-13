import { NextResponse } from "next/server";
import { db } from "@/server/db";

// Sirve la foto de perfil guardada en BD (traída de Microsoft Graph por
// sincronizar-grupo.mjs). Protegida por el middleware de autenticación como
// el resto de la app — no hace falta un chequeo extra acá.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ usuarioId: string }> },
) {
  const { usuarioId } = await params;

  const usuario = await db.usuario.findUnique({
    where: { id: usuarioId },
    select: { foto: true, fotoTipo: true },
  });

  if (!usuario?.foto) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Uint8Array(usuario.foto), {
    headers: {
      "Content-Type": usuario.fotoTipo ?? "image/jpeg",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
