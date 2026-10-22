import { signOut } from "@/auth";

export default function AccesoDenegadoPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="w-full max-w-md rounded-card bg-white p-8 shadow-card">
        <h1 className="mb-2 text-2xl font-bold text-iib-primary">
          Acceso no autorizado
        </h1>
        <p className="mb-6 text-sm text-iib-secondary">
          Tu cuenta de Microsoft es válida, pero no está registrada como
          colaborador activo en el sistema de Gestión del Desempeño. Si crees
          que esto es un error, comunícate con Gestión Humana.
        </p>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-md border border-iib-secondary px-4 py-2 font-medium text-iib-foreground transition hover:bg-iib-background"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
