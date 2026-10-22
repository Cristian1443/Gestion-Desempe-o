import { signOut } from "@/auth";
import { Boton } from "@/components/ui/Boton";
import { Tarjeta } from "@/components/ui/Tarjeta";

export default function AccesoDenegadoPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <Tarjeta relleno="lg" className="w-full max-w-md">
        <h1 className="mb-2 text-2xl font-bold text-iib-foreground">Tu cuenta no tiene acceso</h1>
        <p className="mb-6 text-sm leading-relaxed text-iib-secondary">
          Tu cuenta de Microsoft es válida, pero no está registrada como colaborador activo en el sistema de Gestión
          del Desempeño. Escribe a Gestión Humana para que revisen tu acceso; mientras tanto puedes cerrar la sesión.
        </p>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Boton type="submit" variante="secundario" className="w-full">
            Cerrar sesión
          </Boton>
        </form>
      </Tarjeta>
    </main>
  );
}
