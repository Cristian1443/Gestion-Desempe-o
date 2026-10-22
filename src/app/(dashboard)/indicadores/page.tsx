import { formatearFecha } from "@/lib/fecha";
import { etiquetaMes } from "@/lib/mes";
import { requireUsuarioAutenticado } from "@/server/auth/rbac";
import { obtenerIndicadores } from "@/server/services/indicadores.service";
import { AgregarIndicador } from "@/components/AgregarIndicador";
import { TarjetaResumen } from "@/components/indicador-ui";
import { accionCrearIndicador } from "./actions";
import { IndicadorCard } from "./components";

const ROLES_EDITORES = ["GESTOR_CORPORATIVO", "GESTION_HUMANA", "ADMIN"] as const;

export default async function IndicadoresPage() {
  const usuario = await requireUsuarioAutenticado();
  const puedeEditar = ROLES_EDITORES.some((rol) => usuario.roles.includes(rol));

  const datos = await obtenerIndicadores();

  if (!datos) {
    return (
      <div className="rounded-card bg-iib-surface p-6 text-center shadow-card">
        <p className="text-sm text-iib-secondary">No hay un periodo de evaluación abierto en este momento.</p>
      </div>
    );
  }

  const { indicadores, cumplimiento, mesActual, mesesRegistrables, meses, responsables, tope } = datos;
  const faltanPorCargar = Math.max(0, tope - indicadores.length);

  const cumplen = indicadores.filter((i) => i.estado === "CUMPLE").length;
  const noCumplen = indicadores.filter((i) => i.estado === "NO_CUMPLE").length;
  const enSeguimiento = indicadores.length - cumplen - noCumplen;

  const mesEsRegistrable = mesesRegistrables.includes(mesActual);
  const sinAvanceEsteMes = mesEsRegistrable
    ? indicadores.filter((i) => i.cumplido === null && !i.avances.some((a) => a.mes === mesActual))
    : [];

  const cumplimientoEnCurso = cumplimiento?.estado === "EN_CURSO";

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-iib-foreground">Indicadores de la empresa</h1>
        <p className="max-w-3xl text-sm text-iib-secondary">
          Son {tope} para toda la Corporación. No llevan peso: cada mes se registra su avance acumulado con un
          comentario y al final se marca si cumple o no cumple.
        </p>
        <p className="text-sm text-iib-secondary">
          Periodo <strong className="font-semibold text-iib-foreground">{datos.periodo.nombre}</strong>
          {" · "}
          Mes en curso{" "}
          <strong className="font-semibold capitalize text-iib-foreground">{etiquetaMes(mesActual)}</strong>
          {" · "}
          {responsables.length > 0 ? (
            <>
              Responsable del seguimiento:{" "}
              <strong className="font-semibold text-iib-foreground">{responsables.join(", ")}</strong>
            </>
          ) : (
            "Sin responsable asignado todavía (rol Gestor de objetivos corporativos)."
          )}
        </p>
        <p className="text-sm text-iib-secondary">
          {cumplimiento
            ? cumplimiento.estado === "EN_CURSO"
              ? `Resultado final: ya se puede marcar Cumple o No cumple, hasta el ${formatearFecha(cumplimiento.fin)}.`
              : cumplimiento.estado === "PROXIMA"
                ? `Resultado final: se marca del ${formatearFecha(cumplimiento.inicio)} al ${formatearFecha(cumplimiento.fin)}.`
                : `La franja del resultado final terminó el ${formatearFecha(cumplimiento.fin)}.`
            : "Gestión Humana todavía no definió la franja del resultado final."}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Resumen de indicadores">
        <TarjetaResumen etiqueta="Indicadores" valor={`${indicadores.length} de ${tope}`} />
        <TarjetaResumen etiqueta="Cumplen" valor={cumplen} />
        <TarjetaResumen etiqueta="No cumplen" valor={noCumplen} />
        <TarjetaResumen etiqueta="En seguimiento" valor={enSeguimiento} destacada />
      </section>

      {puedeEditar && faltanPorCargar > 0 && (
        <div className="rounded-md border-l-4 border-warning bg-warning-bg px-4 py-3 text-sm text-warning">
          <p className="font-semibold">
            Faltan {faltanPorCargar} indicador{faltanPorCargar === 1 ? "" : "es"} por cargar
          </p>
          <p className="mt-0.5 text-warning/90">Deben ser {tope}; el periodo no se puede cerrar con menos.</p>
        </div>
      )}

      {puedeEditar && sinAvanceEsteMes.length > 0 && (
        <div className="rounded-md border-l-4 border-warning bg-warning-bg px-4 py-3 text-sm text-warning">
          <p className="font-semibold">
            Faltan por registrar el avance de <span className="capitalize">{etiquetaMes(mesActual)}</span>
          </p>
          <p className="mt-0.5 text-warning/90">
            {sinAvanceEsteMes
              .slice(0, 5)
              .map((i) => i.titulo)
              .join(" · ")}
            {sinAvanceEsteMes.length > 5 ? ` · y ${sinAvanceEsteMes.length - 5} más` : ""}
          </p>
        </div>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-iib-border pb-2.5">
          <h2 className="text-base font-bold">Seguimiento mes a mes</h2>
          {puedeEditar && <span className="text-sm text-iib-secondary">Toca un mes para registrar su avance.</span>}
        </div>

        {indicadores.length === 0 ? (
          <p className="text-sm text-iib-secondary">
            {puedeEditar
              ? `Todavía no hay indicadores. Agrega los ${tope} para empezar el seguimiento.`
              : "Todavía no se han cargado los indicadores del periodo."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {indicadores.map((indicador) => (
              <IndicadorCard
                key={indicador.id}
                indicador={indicador}
                meses={meses}
                mesActual={mesActual}
                mesesRegistrables={mesesRegistrables}
                puedeEditar={puedeEditar}
                cumplimientoEnCurso={cumplimientoEnCurso}
              />
            ))}
          </div>
        )}

        {puedeEditar && faltanPorCargar > 0 && <AgregarIndicador accion={accionCrearIndicador} />}
      </section>
    </>
  );
}
