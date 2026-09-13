import { formatearFecha } from "@/lib/fecha";
import { requireUsuarioAutenticado } from "@/server/auth/rbac";
import { obtenerMisObjetivos } from "@/server/services/objetivos.service";
import {
  ObjetivoCorporativoRow,
  ObjetivoIndividualCard,
  ObjetivoSoloLecturaCard,
  TarjetaCategoria,
  VolverASelectorLink,
} from "./components";
import { ProponerObjetivosForm } from "./ProponerObjetivosForm";

type Categoria = "corporativo" | "gerencia" | "desempeno" | "desarrollo";

function diasHasta(fecha: Date): number {
  const msPorDia = 1000 * 60 * 60 * 24;
  return Math.ceil((fecha.getTime() - Date.now()) / msPorDia);
}

export default async function MisObjetivosPage({
  searchParams,
}: {
  searchParams: { categoria?: string };
}) {
  const usuario = await requireUsuarioAutenticado();
  const datos = await obtenerMisObjetivos(usuario.usuarioId);

  if (!datos) {
    return (
      <div className="rounded-card bg-iib-surface p-6 text-center shadow-card">
        <p className="text-sm text-iib-secondary">
          No hay un periodo de evaluación abierto en este momento. Cuando Gestión
          Humana abra el periodo, tus objetivos aparecerán aquí.
        </p>
      </div>
    );
  }

  const { periodo, corteActual, nombreJefe, individuales, gerencia, corporativos } = datos;
  const diasParaCierre = corteActual ? diasHasta(corteActual.fechaLimite) : null;

  const desempeno = individuales.filter((o) => o.tipoIndividual === "DESEMPENO");
  const desarrollo = individuales.filter((o) => o.tipoIndividual === "DESARROLLO");
  // El conjunto de individuales se propone/corrige de una sola vez (desempeño +
  // desarrollo juntos, ver ProponerObjetivosForm) — mientras eso no exista
  // todavía, no tiene sentido separar sus tarjetas en el selector: cualquiera
  // de las dos lleva al mismo formulario combinado.
  const individualesSinResolver =
    individuales.length === 0 || individuales.every((o) => o.estadoAprobacion === "DEVUELTO");

  const categoria = (
    ["corporativo", "gerencia", "desempeno", "desarrollo"] as Categoria[]
  ).includes(searchParams.categoria as Categoria)
    ? (searchParams.categoria as Categoria)
    : undefined;

  return (
    <>
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-bold text-iib-foreground">Mis objetivos</h1>
          <p className="mt-1 text-sm text-iib-secondary">
            Consulta y propone tus objetivos del periodo, organizados por categoría.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-full border border-iib-border bg-iib-surface px-5 py-2.5 text-xs text-iib-secondary shadow-card">
          <span>
            Periodo <strong className="font-semibold text-iib-foreground">{periodo.nombre}</strong>
            {" · "}
            {periodo.estado === "ABIERTO" ? "Abierto" : periodo.estado}
          </span>

          {corteActual && (
            <>
              <span className="h-3 w-px bg-iib-border" aria-hidden />
              <span className={diasParaCierre !== null && diasParaCierre <= 15 ? "font-medium text-warning" : undefined}>
                Corte <strong className="font-semibold">{corteActual.numero}</strong>
                {diasParaCierre !== null &&
                  (diasParaCierre >= 0
                    ? ` · vence en ${diasParaCierre} días`
                    : ` · venció el ${formatearFecha(corteActual.fechaLimite)}`)}
              </span>
            </>
          )}

          {gerencia.nombreGerencia && (
            <>
              <span className="h-3 w-px bg-iib-border" aria-hidden />
              <span>
                Gerencia{" "}
                <strong className="font-semibold text-iib-foreground">{gerencia.nombreGerencia}</strong>
              </span>
            </>
          )}

          {nombreJefe && (
            <>
              <span className="h-3 w-px bg-iib-border" aria-hidden />
              <span>
                Jefe <strong className="font-semibold text-iib-foreground">{nombreJefe}</strong>
              </span>
            </>
          )}
        </div>
      </div>

      {!categoria ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TarjetaCategoria
            categoria="corporativo"
            titulo="Indicadores"
            resumen={
              corporativos.length === 0
                ? "Aún no cargados"
                : `${corporativos.length} objetivos · 30% de la nota`
            }
            detalle="Aplican a toda la Corporación"
          />
          {gerencia.nombreGerencia ? (
            <TarjetaCategoria
              categoria="gerencia"
              titulo="Gerencia"
              resumen={
                gerencia.objetivos.length === 0
                  ? "Aún no cargados"
                  : `${gerencia.objetivos.length} objetivos · 30% de la nota`
              }
              detalle={gerencia.nombreGerencia}
            />
          ) : null}
          <TarjetaCategoria
            categoria="desempeno"
            titulo="Desempeño"
            resumen={
              individualesSinResolver
                ? individuales.length === 0
                  ? "Aún no propuestos"
                  : "Devueltos por tu jefe"
                : `${desempeno.length} objetivos · 40% de la nota`
            }
            detalle="Van contra una línea estratégica"
          />
          <TarjetaCategoria
            categoria="desarrollo"
            titulo="Desarrollo"
            resumen={
              individualesSinResolver
                ? individuales.length === 0
                  ? "Aún no propuestos"
                  : "Devueltos por tu jefe"
                : `${desarrollo.length} objetivos · sin peso`
            }
            detalle="Van contra una competencia a fortalecer"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <VolverASelectorLink />

          {categoria === "corporativo" && (
            <section className="flex flex-col gap-4" aria-labelledby="nivel-corporativo">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-iib-border pb-2.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 id="nivel-corporativo" className="text-base font-bold">
                    Objetivos corporativos
                  </h2>
                  <span className="rounded-full bg-iib-primary/10 px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-iib-primary">
                    30% de la nota final
                  </span>
                </div>
                <span className="rounded-full border border-iib-border px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-iib-secondary">
                  Solo lectura
                </span>
              </div>
              <p className="-mt-2.5 text-sm text-iib-secondary">Aplican a toda la Corporación.</p>

              {corporativos.length === 0 ? (
                <p className="text-sm text-iib-secondary">
                  Gestión Humana aún no ha cargado los objetivos corporativos de este periodo.
                </p>
              ) : (
                <div className="overflow-hidden rounded-card bg-iib-surface shadow-card">
                  {corporativos.map((objetivo, indice) => (
                    <ObjetivoCorporativoRow key={objetivo.id} objetivo={objetivo} numero={indice + 1} />
                  ))}
                </div>
              )}
            </section>
          )}

          {categoria === "gerencia" && gerencia.nombreGerencia && (
            <section className="flex flex-col gap-4" aria-labelledby="nivel-gerencia">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-iib-border pb-2.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 id="nivel-gerencia" className="text-base font-bold">
                    Objetivos de gerencia
                  </h2>
                  <span className="rounded-full bg-iib-primary/10 px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-iib-primary">
                    30% de la nota final
                  </span>
                </div>
                <span className="rounded-full border border-iib-border px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-iib-secondary">
                  Solo lectura
                </span>
              </div>
              <p className="-mt-2.5 text-sm text-iib-secondary">
                Aplican a todo el equipo de {gerencia.nombreGerencia}.
              </p>

              {gerencia.objetivos.length === 0 ? (
                <p className="text-sm text-iib-secondary">
                  Gestión Humana aún no ha cargado los objetivos de tu gerencia para este periodo.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {gerencia.objetivos.map((objetivo, indice) => (
                    <ObjetivoSoloLecturaCard key={objetivo.id} objetivo={objetivo} numero={indice + 1} />
                  ))}
                </div>
              )}
            </section>
          )}

          {(categoria === "desempeno" || categoria === "desarrollo") && (
            <section
              className="flex flex-col gap-4"
              aria-labelledby={`nivel-${categoria}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-iib-border pb-2.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 id={`nivel-${categoria}`} className="text-base font-bold">
                    {categoria === "desempeno" ? "Objetivos de desempeño" : "Objetivos de desarrollo"}
                  </h2>
                  <span className="rounded-full bg-iib-primary/10 px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-iib-primary">
                    {categoria === "desempeno" ? "40% de la nota final" : "Sin peso"}
                  </span>
                </div>
                <span className="text-sm text-iib-secondary">
                  {individualesSinResolver
                    ? "Se proponen junto con los de la otra categoría individual"
                    : `${(categoria === "desempeno" ? desempeno : desarrollo).length} objetivo${
                        (categoria === "desempeno" ? desempeno : desarrollo).length === 1 ? "" : "s"
                      }`}
                </span>
              </div>

              {individualesSinResolver ? (
                individuales.length === 0 ? (
                  <ProponerObjetivosForm />
                ) : (
                  <>
                    <div className="flex flex-col gap-4">
                      {individuales.map((objetivo, indice) => (
                        <ObjetivoIndividualCard key={objetivo.id} objetivo={objetivo} numero={indice + 1} />
                      ))}
                    </div>
                    <p className="text-sm font-medium text-iib-foreground">
                      Tu jefe devolvió tu propuesta. Ajusta y vuelve a enviar el conjunto completo:
                    </p>
                    <ProponerObjetivosForm objetivosPrevios={individuales} />
                  </>
                )
              ) : (
                <div className="flex flex-col gap-4">
                  {(categoria === "desempeno" ? desempeno : desarrollo).map((objetivo, indice) => (
                    <ObjetivoIndividualCard key={objetivo.id} objetivo={objetivo} numero={indice + 1} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </>
  );
}
