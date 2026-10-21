import { formatearFecha } from "@/lib/fecha";
import { estadoFranja, hoyEnBogota } from "@/lib/franja";
import type { FranjaUI } from "@/lib/franja-ui";
import { RegistrarSeguimientoDialog } from "@/components/RegistrarSeguimientoDialog";
import { CumplimientoLectura } from "@/components/CumplimientoLectura";
import { BotonAccionSimple } from "@/components/AccionesSimples";
import type { ObjetivoCorporativoVista } from "@/server/services/corporativos.service";
import { accionAbrirPeriodo, accionCerrarPeriodo, accionRegistrarSeguimientoCorporativo } from "./actions";
import { AgregarSeguimientoForm } from "./AgregarSeguimientoForm";
import { CalificacionCorporativaControl } from "./CalificacionCorporativaControl";
import { FranjaCumplimientoForm } from "./FranjaCumplimientoForm";
import { SeguimientoRow } from "./SeguimientoRow";

const ETIQUETA_ESTADO_PERIODO: Record<string, string> = {
  BORRADOR: "Borrador",
  ABIERTO: "Abierto",
  CERRADO: "Cerrado",
};

const CLASES_ESTADO_PERIODO: Record<string, string> = {
  BORRADOR: "bg-iib-surface-sunken text-iib-secondary",
  ABIERTO: "bg-success-bg text-success",
  CERRADO: "bg-iib-surface-sunken text-iib-secondary",
};

export function ObjetivoCorporativoCard({
  objetivo,
  numero,
  franja,
  puedeCalificar,
}: {
  objetivo: ObjetivoCorporativoVista;
  numero: number;
  franja: FranjaUI;
  puedeCalificar: boolean;
}) {
  const enCurso = franja.seguimientoEnCurso;
  const yaTieneRegistroDeEste = enCurso
    ? objetivo.seguimientos.some((s) => s.numero === enCurso.numero)
    : false;

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
            <li key={s.numero} className="rounded-md bg-iib-surface-sunken px-3 py-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="text-xs font-bold text-iib-foreground">Seguimiento {s.numero}</span>
                <span className="text-xs text-iib-secondary">{formatearFecha(s.fecha)}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed">{s.comentario}</p>
            </li>
          ))}
        </ul>
      )}

      {franja.cumplimientoEnCurso && puedeCalificar ? (
        <div className="flex justify-end pt-0.5">
          <CalificacionCorporativaControl objetivo={objetivo} />
        </div>
      ) : (
        <>
          <CumplimientoLectura calificacionFinal={objetivo.calificacionFinal} />
          {enCurso && (
            <div className="flex justify-end pt-0.5">
              <RegistrarSeguimientoDialog
                objetivoId={objetivo.id}
                tituloObjetivo={objetivo.titulo}
                numeroSeguimiento={enCurso.numero}
                franja={enCurso.texto}
                etiquetaBoton={
                  yaTieneRegistroDeEste
                    ? `Actualizar seguimiento ${enCurso.numero}`
                    : `Registrar seguimiento ${enCurso.numero}`
                }
                etiquetaEnviar="Guardar"
                accion={accionRegistrarSeguimientoCorporativo}
              />
            </div>
          )}
        </>
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
    cumplimientoInicio: Date | null;
    cumplimientoFin: Date | null;
    seguimientos: Array<{
      id: string;
      numero: number;
      fechaInicio: Date;
      fechaFin: Date;
      _count: { registros: number };
    }>;
  };
}) {
  const hoy = hoyEnBogota();
  const cerrado = periodo.estado === "CERRADO";
  const franjaCumplimiento =
    periodo.cumplimientoInicio && periodo.cumplimientoFin
      ? { inicio: periodo.cumplimientoInicio, fin: periodo.cumplimientoFin }
      : null;

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

      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-iib-secondary">Seguimientos del periodo</p>
        {periodo.seguimientos.length === 0 ? (
          <p className="text-xs text-iib-secondary">
            Todavía no hay seguimientos. Agrega cada uno con su franja de fechas: solo se podrá registrar dentro de
            esas fechas.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {periodo.seguimientos.map((seguimiento) => (
              <SeguimientoRow
                key={seguimiento.id}
                seguimiento={seguimiento}
                estado={estadoFranja(seguimiento.fechaInicio, seguimiento.fechaFin, hoy)}
                registros={seguimiento._count.registros}
                periodoCerrado={cerrado}
              />
            ))}
          </div>
        )}
        {!cerrado && <AgregarSeguimientoForm periodoId={periodo.id} />}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-iib-secondary">
          % de cumplimiento final
        </p>
        {franjaCumplimiento ? (
          <p className="text-sm">
            Del {formatearFecha(franjaCumplimiento.inicio)} al {formatearFecha(franjaCumplimiento.fin)}
          </p>
        ) : (
          <p className="text-xs text-iib-secondary">
            Sin franja.{" "}
            {periodo.estado === "BORRADOR"
              ? "Defínela para poder abrir el periodo: "
              : "Nadie puede poner el % de cumplimiento hasta que la definas: "}
            es el rango de fechas en que jefes, gerentes y Gestión Humana lo ponen en cada objetivo.
          </p>
        )}
        {!cerrado && (
          <FranjaCumplimientoForm
            periodoId={periodo.id}
            inicio={periodo.cumplimientoInicio?.toISOString().slice(0, 10) ?? ""}
            fin={periodo.cumplimientoFin?.toISOString().slice(0, 10) ?? ""}
          />
        )}
      </div>

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
