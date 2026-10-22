import { cumpleCalificacion } from "@/lib/calificacion";
import { formatearFecha as formatearFechaBase } from "@/lib/fecha";
import { LINEAS_ESTRATEGICAS, type LineaEstrategicaCodigo } from "@/lib/lineas-estrategicas";
import type { ObjetivoVista, SeguimientoVista } from "@/server/services/objetivos.service";

function clasificacion(objetivo: ObjetivoVista): {
  tipoTexto: string;
  detalle: string;
  colorTexto: string;
  colorPill: string;
  colorBorde: string;
} | null {
  if (objetivo.tipoIndividual === "DESEMPENO" && objetivo.lineaEstrategica) {
    return {
      tipoTexto: "Desempeño",
      detalle: LINEAS_ESTRATEGICAS[objetivo.lineaEstrategica as LineaEstrategicaCodigo],
      colorTexto: "text-iib-primary",
      colorPill: "bg-iib-primary",
      colorBorde: "border-l-iib-primary",
    };
  }
  if (objetivo.tipoIndividual === "DESARROLLO" && objetivo.competencia) {
    return {
      tipoTexto: "Desarrollo",
      detalle: `Competencia: ${objetivo.competencia}`,
      colorTexto: "text-blue-700",
      colorPill: "bg-blue-700",
      colorBorde: "border-l-blue-700",
    };
  }
  return null;
}

function ClasificacionBadge({ objetivo }: { objetivo: ObjetivoVista }) {
  const clase = clasificacion(objetivo);
  if (!clase) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-white ${clase.colorPill}`}
      >
        {clase.tipoTexto}
      </span>
      <span className={`text-xs font-medium ${clase.colorTexto}`}>{clase.detalle}</span>
    </div>
  );
}

function formatearFecha(fecha: Date): string {
  return formatearFechaBase(fecha);
}

function BitacoraSeguimiento({ seguimientos }: { seguimientos: SeguimientoVista[] }) {
  if (seguimientos.length === 0) {
    return <p className="text-xs text-iib-secondary">Aún no hay seguimientos registrados.</p>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-iib-secondary">
        Bitácora de seguimiento
      </p>
      <ul className="flex flex-col gap-2.5">
        {seguimientos.map((s) => (
          <li key={s.numero} className="rounded-md bg-iib-surface-sunken px-3 py-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="text-xs font-bold text-iib-foreground">
                Seguimiento {s.numero}
                {s.porcentaje !== null ? ` · ${s.porcentaje}%` : ""}
              </span>
              <span className="text-xs text-iib-secondary">
                {formatearFecha(s.fecha)} · {s.registradoPorNombre}
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed">{s.comentario}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ObjetivoIndividualCard({
  objetivo,
  numero,
}: {
  objetivo: ObjetivoVista;
  numero: number;
}) {
  const encabezado = (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-iib-surface-sunken text-xs font-bold text-iib-secondary">
          {numero}
        </span>
        {objetivo.tipoIndividual === "DESARROLLO" ? (
          <span className="rounded-full bg-iib-surface-sunken px-2.5 py-1 text-xs font-bold text-iib-secondary">
            Sin peso
          </span>
        ) : (
          <span className="rounded-full bg-iib-surface-sunken px-2.5 py-1 text-xs font-bold tabular-nums text-iib-secondary">
            {objetivo.peso}%
          </span>
        )}
      </div>
      {objetivo.estadoAprobacion === "PENDIENTE_APROBACION" ? (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-warning-bg px-2.5 py-1 text-xs font-semibold text-warning">
          <span className="h-2 w-2 rounded-full bg-current" />
          Pendiente de aprobación
        </span>
      ) : objetivo.estadoAprobacion === "DEVUELTO" ? (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-danger-bg px-2.5 py-1 text-xs font-semibold text-danger">
          <span className="h-2 w-2 rounded-full bg-current" />
          Devuelto por tu jefe
        </span>
      ) : null}
    </div>
  );

  const detalle = (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-iib-secondary">Descripción</p>
          <p className="text-sm leading-relaxed">{objetivo.descripcion}</p>
        </div>
        {objetivo.acciones && (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-iib-secondary">Acciones</p>
            <p className="text-sm leading-relaxed">{objetivo.acciones}</p>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-iib-secondary">Indicador</p>
        <p className="text-sm leading-relaxed">{objetivo.indicador}</p>
      </div>
      {objetivo.linkRepositorio && (
        <a
          href={objetivo.linkRepositorio}
          target="_blank"
          rel="noreferrer"
          className="w-fit text-sm font-medium text-iib-primary underline"
        >
          Repositorio de evidencias
        </a>
      )}
    </div>
  );

  const colorBorde = clasificacion(objetivo)?.colorBorde ?? "border-l-transparent";

  if (objetivo.estadoAprobacion !== "APROBADO") {
    return (
      <article
        className={`flex flex-col gap-4 rounded-card border-l-4 bg-iib-surface p-6 shadow-card ${colorBorde}`}
      >
        {encabezado}
        <div className="flex flex-col gap-1.5">
          <h3 className="text-balance text-base font-semibold leading-snug">{objetivo.titulo}</h3>
          <ClasificacionBadge objetivo={objetivo} />
        </div>
        {detalle}
        {objetivo.estadoAprobacion === "DEVUELTO" && objetivo.comentarioAprobacion && (
          <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
            “{objetivo.comentarioAprobacion}”
          </p>
        )}
      </article>
    );
  }

  return (
    <article
      className={`flex flex-col gap-4 rounded-card border-l-4 bg-iib-surface p-6 shadow-card ${colorBorde}`}
    >
      {encabezado}

      <div className="flex flex-col gap-1.5">
        <h3 className="text-balance text-base font-semibold leading-snug">{objetivo.titulo}</h3>
        <ClasificacionBadge objetivo={objetivo} />
      </div>

      {detalle}

      <BitacoraSeguimiento seguimientos={objetivo.seguimientos} />

      <CalificacionFinalVista objetivo={objetivo} />
    </article>
  );
}

export function CalificacionFinalVista({ objetivo }: { objetivo: ObjetivoVista }) {
  if (objetivo.tipoIndividual === "DESARROLLO") {
    if (objetivo.cumplioDesarrollo === null) return null;
    return (
      <p className="rounded-md bg-iib-surface-sunken px-3 py-2 text-sm font-medium">
        Resultado: {objetivo.cumplioDesarrollo ? "cumplido" : "no cumplido"}
      </p>
    );
  }

  // Indicadores de gerencia: sin % de calificación, solo Cumple / No cumple.
  if (objetivo.cumplido !== null) {
    return (
      <p className="flex items-center gap-2 rounded-md bg-iib-surface-sunken px-3 py-2 text-sm font-medium">
        Resultado final:
        <span
          className={`rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${
            objetivo.cumplido ? "bg-success text-white" : "bg-danger text-white"
          }`}
        >
          {objetivo.cumplido ? "Cumple" : "No cumple"}
        </span>
      </p>
    );
  }

  if (objetivo.calificacionFinal === null) return null;
  const cumple = cumpleCalificacion(objetivo.calificacionFinal);
  return (
    <p className="flex items-center gap-2 rounded-md bg-iib-surface-sunken px-3 py-2 text-sm font-medium">
      % de cumplimiento: {objetivo.calificacionFinal}%
      <span
        className={`rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${
          cumple ? "bg-success text-white" : "bg-danger text-white"
        }`}
      >
        {cumple ? "Cumple" : "No cumple"}
      </span>
    </p>
  );
}

export function ObjetivoSoloLecturaCard({
  objetivo,
  numero,
}: {
  objetivo: ObjetivoVista;
  numero: number;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-card bg-iib-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-iib-surface-sunken text-xs font-bold text-iib-secondary">
          {numero}
        </span>
        <span className="rounded-full bg-iib-surface-sunken px-2.5 py-1 text-xs font-bold text-iib-secondary">
          Sin peso
        </span>
      </div>

      <h3 className="text-balance text-[0.98rem] font-semibold leading-snug">{objetivo.titulo}</h3>

      <dl className="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1 text-sm">
        <dt className="text-iib-secondary">Indicador</dt>
        <dd className="font-medium">{objetivo.indicador}</dd>
      </dl>

      <BitacoraSeguimiento seguimientos={objetivo.seguimientos} />

      <CalificacionFinalVista objetivo={objetivo} />
    </article>
  );
}
