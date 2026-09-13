import { formatearFecha } from "@/lib/fecha";
import { ReportarAvanceDialog } from "@/components/ReportarAvanceDialog";
import { BotonAccionSimple } from "@/components/AccionesSimples";
import type { ObjetivoCorporativoVista } from "@/server/services/corporativos.service";
import {
  accionAbrirPeriodo,
  accionCerrarPeriodo,
  accionPasarAEvaluacion,
  accionReportarAvanceCorporativo,
} from "./actions";
import { AgregarCorteForm } from "./AgregarCorteForm";
import { CalificacionCorporativaControl } from "./CalificacionCorporativaControl";
import { CorteRow } from "./CorteRow";

const ETIQUETA_ESTADO_PERIODO: Record<string, string> = {
  BORRADOR: "Borrador",
  ABIERTO: "Abierto",
  EN_EVALUACION: "En evaluación",
  CERRADO: "Cerrado",
};

const CLASES_ESTADO_PERIODO: Record<string, string> = {
  BORRADOR: "bg-iib-surface-sunken text-iib-secondary",
  ABIERTO: "bg-success-bg text-success",
  EN_EVALUACION: "bg-warning-bg text-warning",
  CERRADO: "bg-iib-surface-sunken text-iib-secondary",
};

export function ObjetivoCorporativoCard({
  objetivo,
  numero,
  numeroCorteActual,
  periodoEstado,
  puedeCalificar,
}: {
  objetivo: ObjetivoCorporativoVista;
  numero: number;
  numeroCorteActual: number | null;
  periodoEstado: string;
  puedeCalificar: boolean;
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

      <h3 className="text-balance text-[0.95rem] font-semibold leading-snug">{objetivo.titulo}</h3>

      <dl className="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1 text-sm">
        <dt className="text-iib-secondary">Indicador</dt>
        <dd className="font-medium">{objetivo.indicador}</dd>
      </dl>

      {objetivo.seguimientos.length === 0 ? (
        <p className="text-xs text-iib-secondary">Aún sin seguimiento registrado.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {objetivo.seguimientos.map((s) => (
            <li key={s.numeroCorte} className="rounded-md bg-iib-surface-sunken px-3 py-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="text-xs font-bold text-iib-foreground">Corte {s.numeroCorte}</span>
                <div className="flex items-center gap-2">
                  {s.porcentajeAvance !== null && (
                    <span className="rounded-full bg-iib-primary/10 px-2 py-0.5 text-[0.7rem] font-bold tabular-nums text-iib-primary">
                      {s.porcentajeAvance}%
                    </span>
                  )}
                  <span className="text-xs text-iib-secondary">{formatearFecha(s.fecha)}</span>
                </div>
              </div>
              <p className="mt-1 text-sm leading-relaxed">{s.comentario}</p>
            </li>
          ))}
        </ul>
      )}

      {periodoEstado === "EN_EVALUACION" && puedeCalificar ? (
        <div className="flex justify-end pt-0.5">
          <CalificacionCorporativaControl objetivo={objetivo} />
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
              incluirAvance
              accion={accionReportarAvanceCorporativo}
            />
          </div>
        )
      )}
    </article>
  );
}

export function PeriodoRow({
  periodo,
}: {
  periodo: {
    id: string;
    nombre: string;
    fechaInicio: Date;
    fechaFin: Date;
    estado: string;
    cortes: Array<{ id: string; numero: number; nombre: string; fechaLimite: Date; estado: string }>;
  };
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-iib-border p-4 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{periodo.nombre}</p>
          <p className="text-xs text-iib-secondary">
            {formatearFecha(periodo.fechaInicio)} – {formatearFecha(periodo.fechaFin)}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${CLASES_ESTADO_PERIODO[periodo.estado]}`}
        >
          {ETIQUETA_ESTADO_PERIODO[periodo.estado]}
        </span>
      </div>

      {periodo.cortes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {periodo.cortes.map((corte) => (
            <CorteRow key={corte.id} corte={corte} />
          ))}
        </div>
      )}

      {periodo.estado !== "CERRADO" && <AgregarCorteForm periodoId={periodo.id} />}

      {periodo.estado === "BORRADOR" && (
        <div className="flex justify-end">
          <BotonAccionSimple
            etiqueta="Abrir periodo"
            etiquetaEnviando="Abriendo…"
            accion={accionAbrirPeriodo.bind(null, periodo.id)}
          />
        </div>
      )}

      {periodo.estado === "ABIERTO" && (
        <div className="flex justify-end">
          <BotonAccionSimple
            etiqueta="Pasar a evaluación"
            etiquetaEnviando="Actualizando…"
            variante="ghost"
            accion={accionPasarAEvaluacion.bind(null, periodo.id)}
          />
        </div>
      )}

      {periodo.estado === "EN_EVALUACION" && (
        <div className="flex justify-end">
          <BotonAccionSimple
            etiqueta="Cerrar periodo"
            etiquetaEnviando="Cerrando…"
            variante="ghost"
            accion={accionCerrarPeriodo.bind(null, periodo.id)}
          />
        </div>
      )}
    </div>
  );
}
