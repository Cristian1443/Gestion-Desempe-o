import { requireUsuarioAutenticado } from "@/server/auth/rbac";
import { obtenerIndividualesPorAlcance } from "@/server/services/individuales.service";
import { ObjetivoIndividualCard } from "../mis-objetivos/components";

export default async function IndividualesPage() {
  const usuario = await requireUsuarioAutenticado();
  const datos = await obtenerIndividualesPorAlcance(usuario);
  if (!datos) {
    return (
      <div className="rounded-card bg-iib-surface p-6 text-center shadow-card">
        <p className="text-sm text-iib-secondary">Esta sección es para gerentes y para la dirección.</p>
      </div>
    );
  }

  const { alcance, periodo, grupos } = datos;
  const cerrado = periodo?.estado === "CERRADO";

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-iib-foreground">
          {alcance === "CORPORACION" ? "Metas individuales de la Corporación" : "Metas individuales de mi gerencia"}
        </h1>
        <p className="max-w-3xl text-sm text-iib-secondary">
          {alcance === "CORPORACION"
            ? "Los objetivos de desempeño de todas las personas, por gerencia."
            : "Los objetivos de desempeño de las personas de tu gerencia."}{" "}
          Solo lectura.
          {periodo && (
            <>
              {" "}
              Periodo <strong className="font-semibold text-iib-foreground">{periodo.nombre}</strong>
              {cerrado ? " · cerrado" : " · abierto"}.
            </>
          )}
        </p>
        {periodo && !cerrado && (
          <p className="text-xs text-iib-secondary">
            El PDF de resultado final de cada persona se puede descargar cuando el periodo se cierre.
          </p>
        )}
      </div>

      {!periodo ? (
        <div className="rounded-card bg-iib-surface p-6 text-center shadow-card">
          <p className="text-sm text-iib-secondary">Todavía no hay un periodo de evaluación.</p>
        </div>
      ) : grupos.length === 0 ? (
        <div className="rounded-card bg-iib-surface p-6 text-center shadow-card">
          <p className="text-sm text-iib-secondary">No hay personas en tu alcance.</p>
        </div>
      ) : (
        grupos.map((grupo) => (
          <section key={grupo.gerenciaId} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-iib-border pb-2">
              <h2 className="text-base font-bold">{grupo.gerencia}</h2>
              <span className="text-sm text-iib-secondary">{grupo.personas.length} personas</span>
            </div>

            {grupo.personas.map((persona) => {
              const aprobados = persona.objetivos.filter((o) => o.estadoAprobacion === "APROBADO");
              const cumplen = persona.objetivos.filter((o) => o.cumplido === true).length;
              const conResultado = persona.objetivos.filter((o) => o.cumplido !== null).length;
              return (
                <details key={persona.usuarioId} className="group rounded-card bg-iib-surface shadow-card">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3.5">
                    <div className="flex min-w-0 flex-col">
                      <span className="text-sm font-semibold text-iib-foreground">{persona.nombre}</span>
                      {persona.cargo && <span className="text-xs text-iib-secondary">{persona.cargo}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {persona.objetivos.length === 0 ? (
                        <span className="rounded-full bg-iib-surface-sunken px-2.5 py-1 text-xs font-semibold text-iib-secondary">
                          Aún sin objetivos
                        </span>
                      ) : (
                        <>
                          <span className="rounded-full bg-iib-surface-sunken px-2.5 py-1 text-xs font-semibold text-iib-secondary">
                            {aprobados.length === persona.objetivos.length
                              ? `${aprobados.length} aprobados`
                              : `${aprobados.length} de ${persona.objetivos.length} aprobados`}
                          </span>
                          {conResultado > 0 && (
                            <span className="rounded-full bg-success-bg px-2.5 py-1 text-xs font-semibold text-success">
                              {cumplen} de {persona.objetivos.length} cumplen
                            </span>
                          )}
                        </>
                      )}
                      {cerrado && aprobados.length > 0 && periodo && (
                        <a
                          href={`/api/resultado-individual/${periodo.id}/${persona.usuarioId}`}
                          className="rounded-md border border-iib-primary px-3 py-1 text-xs font-semibold text-iib-primary transition hover:bg-iib-primary hover:text-white"
                        >
                          Descargar PDF
                        </a>
                      )}
                    </div>
                  </summary>
                  {persona.objetivos.length > 0 && (
                    <div className="flex flex-col gap-4 border-t border-iib-border bg-iib-background p-4">
                      {persona.objetivos.map((objetivo, i) => (
                        <ObjetivoIndividualCard key={objetivo.id} objetivo={objetivo} numero={i + 1} />
                      ))}
                    </div>
                  )}
                </details>
              );
            })}
          </section>
        ))
      )}
    </>
  );
}
