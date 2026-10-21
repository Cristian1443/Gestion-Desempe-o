import Link from "next/link";
import { cumpleCalificacion } from "@/lib/calificacion";
import { formatearFecha as formatearFechaBase } from "@/lib/fecha";
import { LINEAS_ESTRATEGICAS, type LineaEstrategicaCodigo } from "@/lib/lineas-estrategicas";
import type { ObjetivoVista, SeguimientoVista } from "@/server/services/objetivos.service";

const COLORES_CATEGORIA = {
  corporativo: {
    texto: "text-emerald-700",
    borde: "border-emerald-700",
    iconoBg: "bg-emerald-50",
    iconoTexto: "text-emerald-700",
  },
  gerencia: {
    texto: "text-amber-700",
    borde: "border-amber-700",
    iconoBg: "bg-amber-50",
    iconoTexto: "text-amber-700",
  },
  desempeno: {
    texto: "text-iib-primary",
    borde: "border-iib-primary",
    iconoBg: "bg-iib-primary/10",
    iconoTexto: "text-iib-primary",
  },
  desarrollo: {
    texto: "text-blue-700",
    borde: "border-blue-700",
    iconoBg: "bg-blue-50",
    iconoTexto: "text-blue-700",
  },
} as const;

function IconoCategoria({ categoria, className }: { categoria: keyof typeof COLORES_CATEGORIA; className?: string }) {
  const props = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (categoria) {
    case "corporativo":
      return (
        <svg {...props}>
          <path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16" />
          <path d="M14 21v-9h5a1 1 0 0 1 1 1v8" />
          <path d="M8 8h.01M11 8h.01M8 11h.01M11 11h.01M8 14h.01M11 14h.01" />
        </svg>
      );
    case "gerencia":
      return (
        <svg {...props}>
          <rect x="3" y="7.5" width="18" height="12" rx="1.5" />
          <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" />
          <path d="M3 12.5h18" />
        </svg>
      );
    case "desempeno":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="4.5" />
          <circle cx="12" cy="12" r="0.75" fill="currentColor" />
        </svg>
      );
    case "desarrollo":
      return (
        <svg {...props}>
          <path d="M4 20 10 12l4 3 6-8" />
          <path d="M15 6h5v5" />
        </svg>
      );
  }
}

export function TarjetaCategoria({
  categoria,
  titulo,
  resumen,
  detalle,
  deshabilitada = false,
}: {
  categoria: keyof typeof COLORES_CATEGORIA;
  titulo: string;
  resumen: string;
  detalle?: string;
  deshabilitada?: boolean;
}) {
  const color = COLORES_CATEGORIA[categoria];

  const contenido = (
    <article
      className={`group flex h-full flex-col gap-4 rounded-card border-t-4 bg-iib-surface p-6 shadow-card transition ${color.borde} ${
        deshabilitada ? "opacity-60" : "hover:-translate-y-0.5 hover:shadow-lg"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${color.iconoBg} ${color.iconoTexto}`}>
          <IconoCategoria categoria={categoria} className="h-6 w-6" />
        </div>
        {!deshabilitada && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 shrink-0 text-iib-secondary/50 transition group-hover:translate-x-0.5 group-hover:text-iib-secondary"
            aria-hidden
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className={`text-[0.7rem] font-bold uppercase tracking-wide ${color.texto}`}>{titulo}</span>
        <p className="text-sm font-semibold text-iib-foreground">{resumen}</p>
        {detalle && <p className="text-xs text-iib-secondary">{detalle}</p>}
      </div>
    </article>
  );

  if (deshabilitada) return contenido;

  return (
    <Link href={`/mis-objetivos?categoria=${categoria}`} className="block h-full">
      {contenido}
    </Link>
  );
}

export function VolverASelectorLink() {
  return (
    <Link
      href="/mis-objetivos"
      className="flex w-fit items-center gap-1.5 text-sm font-semibold text-iib-primary hover:underline"
    >
      ← Volver a mis objetivos
    </Link>
  );
}

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
              <span className="text-xs font-bold text-iib-foreground">Seguimiento {s.numero}</span>
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
        <span className="rounded-full bg-iib-surface-sunken px-2.5 py-1 text-xs font-bold tabular-nums text-iib-secondary">
          {objetivo.peso}%
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

export function ObjetivoCorporativoRow({
  objetivo,
  numero,
}: {
  objetivo: ObjetivoVista;
  numero: number;
}) {
  const ultimo = objetivo.seguimientos[objetivo.seguimientos.length - 1];
  return (
    <div className="flex flex-col gap-1.5 border-b border-iib-border px-4 py-3 last:border-b-0">
      <div className="grid grid-cols-[1.2rem_1fr_auto_auto] items-center gap-x-3">
        <span className="text-xs tabular-nums text-iib-secondary">{numero}</span>
        <span className="text-sm font-medium">{objetivo.titulo}</span>
        {objetivo.calificacionFinal !== null && (
          <span
            className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${
              cumpleCalificacion(objetivo.calificacionFinal)
                ? "bg-success text-white"
                : "bg-danger text-white"
            }`}
          >
            {objetivo.calificacionFinal}% · {cumpleCalificacion(objetivo.calificacionFinal) ? "Cumple" : "No cumple"}
          </span>
        )}
        <span className="w-fit rounded-full bg-iib-surface-sunken px-2.5 py-1 text-xs font-bold tabular-nums text-iib-secondary">
          {objetivo.peso}%
        </span>
      </div>
      <p className="pl-[1.2rem] text-xs text-iib-secondary">
        {ultimo
          ? `Último registro: Seguimiento ${ultimo.numero} · ${formatearFecha(ultimo.fecha)}`
          : "Aún sin seguimiento registrado"}
      </p>
    </div>
  );
}
