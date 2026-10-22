import { FranjaBanner } from "@/components/FranjaBanner";
import { BotonLink } from "@/components/ui/Boton";
import { Callout } from "@/components/ui/Callout";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { PageHeader } from "@/components/ui/PageHeader";
import { Seccion } from "@/components/ui/Seccion";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { formatearFecha } from "@/lib/fecha";
import { pluralizar } from "@/lib/pendientes";
import { requireUsuarioAutenticado } from "@/server/auth/rbac";
import { obtenerMisObjetivos } from "@/server/services/objetivos.service";
import { ObjetivoIndividualCard, ObjetivoSoloLecturaCard } from "./components";
import { ProponerObjetivosForm } from "./ProponerObjetivosForm";

export default async function MisObjetivosPage() {
  const usuario = await requireUsuarioAutenticado();
  const datos = await obtenerMisObjetivos(usuario.usuarioId);

  if (!datos) {
    return (
      <>
        <PageHeader titulo="Mis objetivos" />
        <EstadoVacio titulo="No hay un periodo de evaluación abierto">
          Cuando Gestión Humana abra el periodo, tus objetivos aparecerán aquí.
        </EstadoVacio>
      </>
    );
  }

  const { periodo, franjas, nombreJefe, individuales, gerencia, indicadoresTotal } = datos;

  const desempeno = individuales.filter((o) => o.tipoIndividual === "DESEMPENO");
  const desarrollo = individuales.filter((o) => o.tipoIndividual === "DESARROLLO");
  const devueltos = individuales.filter((o) => o.estadoAprobacion === "DEVUELTO");
  const porAprobar = individuales.filter((o) => o.estadoAprobacion === "PENDIENTE_APROBACION");
  // El conjunto de individuales se propone/corrige de una sola vez (desempeño +
  // desarrollo juntos, ver ProponerObjetivosForm): mientras no haya ninguno, o
  // todos estén devueltos, se muestra el formulario combinado en vez de las
  // tarjetas por categoría.
  const individualesSinResolver = individuales.length === 0 || individuales.every((o) => o.estadoAprobacion === "DEVUELTO");
  const todosAprobados = individuales.length > 0 && individuales.every((o) => o.estadoAprobacion === "APROBADO");

  const cumplimiento = franjas.cumplimiento;

  return (
    <>
      <PageHeader
        titulo="Mis objetivos"
        subtitulo={
          <>
            {gerencia.nombreGerencia && (
              <>
                Gerencia <strong className="font-semibold text-iib-foreground">{gerencia.nombreGerencia}</strong>
              </>
            )}
            {gerencia.nombreGerencia && nombreJefe && " · "}
            {nombreJefe && (
              <>
                Jefe <strong className="font-semibold text-iib-foreground">{nombreJefe}</strong>
              </>
            )}
          </>
        }
      >
        <FranjaBanner periodo={periodo.nombre} franjas={franjas} />
      </PageHeader>

      {/* El siguiente paso, según en qué punto estás. */}
      {individuales.length === 0 ? (
        <Callout tono="aviso" titulo="Propón tus objetivos del periodo" accion={{ href: "#proponer", etiqueta: "Ir al formulario" }}>
          Son 4 de desempeño y 2 de desarrollo. Tu jefe los revisa y los aprueba; hasta entonces no se les puede hacer
          seguimiento.
        </Callout>
      ) : devueltos.length > 0 ? (
        <Callout tono="urgente" titulo={`Tu jefe devolvió ${pluralizar(devueltos.length, "objetivo", "objetivos")}`} accion={{ href: "#proponer", etiqueta: "Corregir" }}>
          Revisa sus comentarios, ajusta y vuelve a enviar el conjunto completo.
        </Callout>
      ) : porAprobar.length > 0 ? (
        <Callout tono="info" titulo="Tus objetivos esperan la aprobación de tu jefe">
          {nombreJefe ? `${nombreJefe} los está revisando.` : "Tu jefe los está revisando."} Te avisamos aquí cuando estén
          aprobados.
        </Callout>
      ) : todosAprobados ? (
        <Callout tono="exito" titulo="Tus objetivos están aprobados">
          {franjas.seguimientoEnCurso
            ? `Tu jefe registra el seguimiento ${franjas.seguimientoEnCurso.numero} hasta el ${formatearFecha(franjas.seguimientoEnCurso.fechaFin)}.`
            : cumplimiento?.estado === "EN_CURSO"
              ? `Tu jefe está poniendo tu % de cumplimiento hasta el ${formatearFecha(cumplimiento.fin)}.`
              : "Tu jefe les hará seguimiento en cada etapa del periodo."}
        </Callout>
      ) : null}

      {individualesSinResolver ? (
        <section id="proponer" className="scroll-mt-32">
          <Seccion
            titulo="Mis objetivos individuales"
            descripcion="Se proponen juntos: 4 de desempeño (40 % de la nota) y 2 de desarrollo (sin peso)."
          >
            {individuales.length === 0 ? (
              <ProponerObjetivosForm />
            ) : (
              <>
                <div className="flex flex-col gap-4">
                  {individuales.map((objetivo, indice) => (
                    <ObjetivoIndividualCard key={objetivo.id} objetivo={objetivo} numero={indice + 1} />
                  ))}
                </div>
                <p className="text-sm font-medium text-iib-foreground">
                  Ajusta tu propuesta y vuelve a enviar el conjunto completo:
                </p>
                <ProponerObjetivosForm objetivosPrevios={individuales} />
              </>
            )}
          </Seccion>
        </section>
      ) : (
        <>
          <Seccion titulo="Desempeño" contador={pluralizar(desempeno.length, "objetivo", "objetivos")} descripcion="Van contra una línea estratégica · 40 % de la nota final.">
            <div className="flex flex-col gap-4">
              {desempeno.map((objetivo, indice) => (
                <ObjetivoIndividualCard key={objetivo.id} objetivo={objetivo} numero={indice + 1} />
              ))}
            </div>
          </Seccion>

          <Seccion titulo="Desarrollo" contador={pluralizar(desarrollo.length, "objetivo", "objetivos")} descripcion="Van contra una competencia a fortalecer · sin peso.">
            <div className="flex flex-col gap-4">
              {desarrollo.map((objetivo, indice) => (
                <ObjetivoIndividualCard key={objetivo.id} objetivo={objetivo} numero={indice + 1} />
              ))}
            </div>
          </Seccion>
        </>
      )}

      {gerencia.nombreGerencia && (
        <Seccion
          titulo="Indicadores de mi gerencia"
          contador="Solo lectura"
          descripcion={`Aplican a todo el equipo de ${gerencia.nombreGerencia}. Los carga y les hace seguimiento tu gerente.`}
        >
          {gerencia.objetivos.length === 0 ? (
            <EstadoVacio titulo="Tu gerente todavía no los ha cargado">
              Cuando los cargue, los verás aquí con su avance en cada seguimiento.
            </EstadoVacio>
          ) : (
            <div className="flex flex-col gap-4">
              {gerencia.objetivos.map((objetivo, indice) => (
                <ObjetivoSoloLecturaCard key={objetivo.id} objetivo={objetivo} numero={indice + 1} />
              ))}
            </div>
          )}
        </Seccion>
      )}

      <Tarjeta className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-iib-foreground">Indicadores de la empresa</h2>
          <p className="mt-0.5 text-sm text-iib-secondary">
            {indicadoresTotal === 0
              ? "Todavía no se han cargado."
              : `${pluralizar(indicadoresTotal, "indicador", "indicadores")} para toda la Corporación · cumple o no cumple.`}
          </p>
        </div>
        <BotonLink href="/indicadores" variante="secundario">
          Ver indicadores
        </BotonLink>
      </Tarjeta>
    </>
  );
}
