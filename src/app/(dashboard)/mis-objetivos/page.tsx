import { FranjaItems } from "@/components/FranjaBanner";
import { DESARROLLO_HABILITADO } from "@/lib/objetivos-config";
import { requireUsuarioAutenticado } from "@/server/auth/rbac";
import { obtenerMisObjetivos } from "@/server/services/objetivos.service";
import {
  ObjetivoIndividualCard,
  ObjetivoSoloLecturaCard,
  TarjetaCategoria,
  VolverASelectorLink,
} from "./components";
import { ProponerObjetivosForm } from "./ProponerObjetivosForm";

type Categoria = "gerencia" | "desempeno" | "desarrollo";

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
          No hay un periodo de evaluación abierto en este momento. Cuando Talento
          Humano abra el periodo, tus objetivos aparecerán aquí.
        </p>
      </div>
    );
  }

  const { periodo, franjas, nombreJefe, individuales, gerencia, indicadoresTotal } = datos;

  const desempeno = individuales.filter((o) => o.tipoIndividual === "DESEMPENO");
  const desarrollo = individuales.filter((o) => o.tipoIndividual === "DESARROLLO");
  // El conjunto de individuales se propone/corrige de una sola vez (desempeño +
  // desarrollo juntos, ver ProponerObjetivosForm) — mientras eso no exista
  // todavía, no tiene sentido separar sus tarjetas en el selector: cualquiera
  // de las dos lleva al mismo formulario combinado.
  const individualesSinResolver =
    individuales.length === 0 || individuales.every((o) => o.estadoAprobacion === "DEVUELTO");

  // Los objetivos de desarrollo no se manejan este año: esa categoría no existe.
  const categorias: Categoria[] = DESARROLLO_HABILITADO ? ["gerencia", "desempeno", "desarrollo"] : ["gerencia", "desempeno"];
  const categoria = categorias.includes(searchParams.categoria as Categoria)
    ? (searchParams.categoria as Categoria)
    : undefined;

  return (
    <>
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-bold text-iib-foreground">Componentes de medición individual</h1>
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

          <FranjaItems franjas={franjas} />

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
            categoria="desempeno"
            titulo="Componente 1 (C1): Metas individuales"
            resumen={
              individualesSinResolver
                ? individuales.length === 0
                  ? "Aún no propuestas"
                  : "Devueltas por tu jefe"
                : `${desempeno.length} metas · cumple o no cumple`
            }
            detalle="Van contra una línea estratégica"
          />
          {gerencia.nombreGerencia ? (
            <TarjetaCategoria
              categoria="gerencia"
              titulo="Componente 2 (C2): Metas por gerencia"
              resumen={
                gerencia.objetivos.length === 0
                  ? "Aún no cargadas"
                  : `${gerencia.objetivos.length} metas · cumple o no cumple`
              }
              detalle={gerencia.nombreGerencia}
            />
          ) : null}
          <TarjetaCategoria
            categoria="corporativo"
            titulo="Componente 3 (C3): Resultado institucional"
            href="/indicadores"
            resumen={
              indicadoresTotal === 0
                ? "Aún no cargado"
                : `${indicadoresTotal} indicador${indicadoresTotal === 1 ? "" : "es"}`
            }
            detalle="Aplica a toda la Corporación · cumple o no cumple"
          />
          {DESARROLLO_HABILITADO && (
            <TarjetaCategoria
              categoria="desarrollo"
              titulo="Desarrollo"
              resumen={
                individualesSinResolver
                  ? individuales.length === 0
                    ? "Aún no propuestos"
                    : "Devueltos por tu jefe"
                  : `${desarrollo.length} objetivos · cumple o no cumple`
              }
              detalle="Van contra una competencia a fortalecer"
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <VolverASelectorLink />

          {categoria === "gerencia" && gerencia.nombreGerencia && (
            <section className="flex flex-col gap-4" aria-labelledby="nivel-gerencia">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-iib-border pb-2.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 id="nivel-gerencia" className="text-base font-bold">
                    Componente 2 (C2): Metas por gerencia
                  </h2>
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
                  El gerente aún no ha cargado los indicadores de tu gerencia para este periodo.
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
                    {categoria === "desempeno" ? "Componente 1 (C1): Metas individuales" : "Objetivos de desarrollo"}
                  </h2>
                  <span className="rounded-full bg-iib-primary/10 px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-iib-primary">
                    Pesos suman 100 % · cumple o no cumple
                  </span>
                </div>
                <span className="text-sm text-iib-secondary">
                  {individualesSinResolver
                    ? DESARROLLO_HABILITADO
                      ? "Se proponen junto con los de la otra categoría individual"
                      : "Se proponen los 4 juntos y se envían a tu jefe"
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
