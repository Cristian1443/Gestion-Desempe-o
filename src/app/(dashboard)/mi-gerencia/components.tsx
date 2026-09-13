import { formatearFecha } from "@/lib/fecha";
import { ReportarAvanceDialog } from "@/components/ReportarAvanceDialog";
import type {
  ColaboradorConsolidado,
  ObjetivoGerenciaVista,
} from "@/server/services/gerencia.service";
import { accionReportarAvanceGerencia } from "./actions";
import { CalificacionGerenciaControl } from "./CalificacionGerenciaControl";

export function ObjetivoGerenciaCard({
  objetivo,
  numero,
  numeroCorteActual,
  periodoEstado,
}: {
  objetivo: ObjetivoGerenciaVista;
  numero: number;
  numeroCorteActual: number | null;
  periodoEstado: string;
}) {
  const yaTieneSeguimientoDelCorte = objetivo.seguimientos.some(
    (s) => s.numeroCorte === numeroCorteActual,
  );

  return (
    <article className="flex flex-col gap-3 rounded-card bg-iib-surface p-5 shadow-card">
      <div className="flex items-center gap-2.5">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-iib-surface-sunken text-xs font-bold text-iib-secondary">
          {numero}
        </span>
        <span className="rounded-full bg-iib-surface-sunken px-2.5 py-1 text-xs font-bold tabular-nums text-iib-secondary">
          {objetivo.peso}%
        </span>
      </div>

      <h3 className="text-balance text-[0.98rem] font-semibold leading-snug">{objetivo.titulo}</h3>

      <dl className="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1 text-sm">
        <dt className="text-iib-secondary">Indicador</dt>
        <dd className="font-medium">{objetivo.indicador}</dd>
        <dt className="text-iib-secondary">Meta</dt>
        <dd className="font-medium">{objetivo.meta}</dd>
      </dl>

      {objetivo.seguimientos.length === 0 ? (
        <p className="text-xs text-iib-secondary">Aún sin seguimiento registrado.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {objetivo.seguimientos.map((s) => (
            <li key={s.numeroCorte} className="rounded-md bg-iib-surface-sunken px-3 py-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="text-xs font-bold text-iib-foreground">Corte {s.numeroCorte}</span>
                <span className="text-xs text-iib-secondary">{formatearFecha(s.fecha)}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed">{s.comentario}</p>
            </li>
          ))}
        </ul>
      )}

      {periodoEstado === "EN_EVALUACION" ? (
        <div className="flex justify-end pt-0.5">
          <CalificacionGerenciaControl objetivo={objetivo} />
        </div>
      ) : (
        numeroCorteActual !== null && (
          <div className="flex justify-end pt-0.5">
            <ReportarAvanceDialog
              objetivoId={objetivo.id}
              tituloObjetivo={objetivo.titulo}
              numeroCorte={numeroCorteActual}
              etiquetaBoton={yaTieneSeguimientoDelCorte ? "Actualizar seguimiento" : "Registrar seguimiento"}
              etiquetaEnviar="Guardar"
              accion={accionReportarAvanceGerencia}
            />
          </div>
        )
      )}
    </article>
  );
}

export function ColaboradorConsolidadoRow({ colaborador }: { colaborador: ColaboradorConsolidado }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-iib-border px-4 py-3.5 last:border-b-0">
      <div>
        <p className="text-sm font-medium">{colaborador.nombre}</p>
        {colaborador.cargo && <p className="text-xs text-iib-secondary">{colaborador.cargo}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-iib-secondary">
        {colaborador.totalObjetivos === 0 ? (
          <span>Sin objetivos propuestos</span>
        ) : (
          <>
            {colaborador.pendientes > 0 && (
              <span className="rounded-full bg-warning-bg px-2.5 py-1 font-semibold text-warning">
                {colaborador.pendientes} pendiente{colaborador.pendientes === 1 ? "" : "s"} de
                aprobación
              </span>
            )}
            <span>
              {colaborador.aprobados}/{colaborador.totalObjetivos} objetivos aprobados
            </span>
            {colaborador.aprobados > 0 && (
              <span className="font-bold tabular-nums text-iib-foreground">
                {colaborador.conSeguimientoDelCorteActual}/{colaborador.aprobados} con seguimiento del
                corte actual
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
