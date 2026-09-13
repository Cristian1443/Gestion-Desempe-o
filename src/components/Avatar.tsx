function iniciales(nombre: string): string {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

// Foto de perfil real (traída de Microsoft Graph, servida por /api/foto/[id])
// o iniciales si la persona no tiene una. La decisión de cuál mostrar se
// toma del lado del servidor (`tieneFoto`, ya sabido desde la consulta a la
// base de datos) — deliberadamente NO se intenta cargar la imagen y caer a
// iniciales si falla en el navegador: ese patrón (onError del lado cliente)
// pierde el evento en SSR cuando la imagen falla antes de que React termine
// de hidratar (el evento "error" de <img> no burbujea ni se re-dispara), y
// el ícono roto se queda ahí para siempre. Decidir server-side lo evita del
// todo y de paso deja este componente sin necesitar ser "use client".
export function Avatar({
  usuarioId,
  nombre,
  tieneFoto,
  size,
  fallbackClassName,
  fallbackTextSize = "text-xs",
}: {
  usuarioId: string;
  nombre: string;
  tieneFoto: boolean;
  size: string;
  fallbackClassName: string;
  fallbackTextSize?: string;
}) {
  if (!tieneFoto) {
    return (
      <div
        className={`grid shrink-0 place-items-center rounded-full font-bold ${size} ${fallbackTextSize} ${fallbackClassName}`}
      >
        {iniciales(nombre)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/foto/${usuarioId}`}
      alt={nombre}
      className={`shrink-0 rounded-full object-cover ${size}`}
    />
  );
}
