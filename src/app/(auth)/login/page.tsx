import Image from "next/image";
import { signIn } from "@/auth";
import { Callout } from "@/components/ui/Callout";
import { claseBoton } from "@/components/ui/Boton";
import { db } from "@/server/db";

// Auth.js manda al login con ?error=<código> cuando algo falla. Se traduce a algo
// que la persona pueda entender y le diga qué hacer.
function mensajeDeError(codigo: string): { titulo: string; detalle: string } {
  if (codigo === "AccessDenied") {
    return {
      titulo: "Tu cuenta no está habilitada",
      detalle: "Tu cuenta de Microsoft es válida, pero no está registrada en el sistema. Escribe a Gestión Humana para que te den acceso.",
    };
  }
  return {
    titulo: "No pudimos iniciar tu sesión",
    detalle: "Inténtalo de nuevo. Si vuelve a pasar, escribe a Gestión Humana.",
  };
}

function IconoMicrosoft() {
  return (
    <svg viewBox="0 0 21 21" className="h-4 w-4 shrink-0" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;
  const fallo = error ? mensajeDeError(error) : null;
  const esDesarrollo = process.env.NODE_ENV !== "production";

  const usuariosDePrueba = esDesarrollo
    ? await db.usuario.findMany({
        where: { activo: true },
        select: { id: true, entraObjectId: true, nombre: true, cargo: true },
        orderBy: { nombre: "asc" },
      })
    : [];

  return (
    <main className="flex min-h-screen">
      {/* Panel de marca — solo en pantallas grandes. Tratamiento oscuro y
          neutro sobre la foto (editorial, no satura todo de rojo); el rojo
          institucional queda como acento puntual: el borde derecho y el
          botón, no bañando la imagen completa. */}
      <div className="relative hidden w-1/2 shrink-0 overflow-hidden border-r-4 border-iib-primary bg-iib-foreground lg:block">
        <Image
          src="/AdobeStock_1062200548.jpeg"
          alt=""
          fill
          sizes="50vw"
          className="object-cover saturate-[0.35] brightness-[0.75]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/40" />

        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <span className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.25em] text-white/85">
            <span className="h-1.5 w-1.5 rounded-full bg-iib-primary" />
            Invest in Bogotá
          </span>
          <div className="max-w-sm">
            <h2 className="text-3xl font-bold leading-tight">Gestión del Desempeño</h2>
            <p className="mt-3 text-white/70">
              Seguimiento y evaluación de objetivos institucionales.
            </p>
          </div>
          <span className="text-xs text-white/50">
            © {new Date().getFullYear()} Invest in Bogotá — Corporación para el Desarrollo
          </span>
        </div>
      </div>

      {/* Panel del formulario — estructurado en franjas (no un solo bloque
          flotando centrado) para que no quede vacío en pantallas anchas. */}
      <div className="flex w-full flex-1 flex-col bg-iib-background px-6 sm:px-10 lg:px-16">
        <div className="flex flex-1 flex-col items-center justify-center py-16">
          <div className="w-full max-w-sm">
            <span className="mb-8 block text-xs font-bold uppercase tracking-[0.25em] text-iib-primary lg:hidden">
              Invest in Bogotá
            </span>

            <h1 className="text-balance text-3xl font-bold tracking-tight text-iib-foreground">Bienvenido</h1>
            <p className="mt-2 text-sm leading-relaxed text-iib-secondary">
              Ingresa con tu cuenta corporativa de Invest in Bogotá para ver qué tienes pendiente.
            </p>

            {fallo && (
              <div className="mt-6">
                <Callout tono="urgente" titulo={fallo.titulo}>
                  {fallo.detalle}
                </Callout>
              </div>
            )}

            <form
              action={async () => {
                "use server";
                await signIn("microsoft-entra-id", {
                  redirectTo: callbackUrl || "/",
                });
              }}
              className="mt-8"
            >
              <button
                type="submit"
                className={`${claseBoton("primario", "md")} w-full`}
              >
                <IconoMicrosoft />
                Iniciar sesión con Microsoft
              </button>
            </form>

            <ul className="mt-8 flex flex-col gap-2.5 border-t border-iib-border pt-6 text-sm text-iib-secondary">
              <li>Propón y aprueba objetivos.</li>
              <li>Registra el seguimiento en cada etapa del periodo.</li>
              <li>Consulta tu avance y tus resultados.</li>
            </ul>

            {esDesarrollo && (
              <div className="mt-8 rounded-md border border-dashed border-iib-border p-5 text-left">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-iib-secondary">
                  Solo desarrollo — sin Microsoft
                </p>
                {usuariosDePrueba.length === 0 ? (
                  <p className="text-sm text-iib-secondary">
                    No hay usuarios de prueba. Corre <code>npx prisma db seed</code>.
                  </p>
                ) : (
                  <form
                    action={async (formData) => {
                      "use server";
                      await signIn("dev-login", {
                        usuarioId: formData.get("usuarioId"),
                        redirectTo: callbackUrl || "/",
                      });
                    }}
                    className="flex flex-col gap-3"
                  >
                    <select
                      name="usuarioId"
                      className="rounded-md border border-iib-border bg-white px-2.5 py-2 text-sm"
                      defaultValue={usuariosDePrueba[0]?.id}
                    >
                      {usuariosDePrueba.map((usuario) => (
                        <option key={usuario.id} value={usuario.id}>
                          {usuario.nombre} — {usuario.cargo}
                          {usuario.entraObjectId ? "" : " (pendiente de primer login)"}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-md border border-iib-secondary px-4 py-2 text-sm font-medium text-iib-foreground transition hover:bg-iib-surface-sunken"
                    >
                      Entrar como este usuario
                    </button>
                  </form>
                )}
              </div>
            )}

            <p className="mt-10 text-xs text-iib-secondary lg:hidden">
              © {new Date().getFullYear()} Invest in Bogotá — Corporación para el Desarrollo
            </p>
          </div>
        </div>

        <div className="hidden justify-center border-t border-iib-border py-6 lg:flex">
          <p className="text-xs text-iib-secondary">
            ¿Problemas para ingresar? Contacta a{" "}
            <span className="font-medium text-iib-foreground">Gestión Humana</span>.
          </p>
        </div>
      </div>
    </main>
  );
}
