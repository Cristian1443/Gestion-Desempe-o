import Link from "next/link";
import { formatearFecha } from "@/lib/fecha";
import { LINEAS_ESTRATEGICAS, type LineaEstrategicaCodigo } from "@/lib/lineas-estrategicas";
import type { ColaboradorEquipo, MiEquipo, ObjetivoEquipoVista } from "@/server/services/equipo.service";
import { accionAprobarObjetivos, accionDevolverObjetivos, accionRegistrarSeguimiento } from "./actions";
import { BotonAccionSimple, DialogDevolverConComentario } from "@/components/AccionesSimples";
import { RegistrarSeguimientoDialog } from "@/components/RegistrarSeguimientoDialog";
import { CumplimientoLectura } from "@/components/CumplimientoLectura";
import type { FranjaUI } from "@/lib/franja-ui";
import { Avatar } from "@/components/Avatar";
import { CalificacionFinalControl } from "./CalificacionFinalControl";

// Verde: todo al día. Rojo: necesita atención (propuesta pendiente de
// aprobar, o le falta el registro del seguimiento de referencia). Gris: aún sin
// objetivos propuestos para el periodo.
type EstadoColaborador = "AL_DIA" | "NECESITA_ATENCION" | "SIN_OBJETIVOS";

function estadoColaborador(
  colaborador: ColaboradorEquipo,
  referenciaNumero: number | null,
): EstadoColaborador {
  if (colaborador.objetivos.length === 0) return "SIN_OBJETIVOS";

  const tienePendientes = colaborador.objetivos.some((o) => o.estadoAprobacion === "PENDIENTE_APROBACION");
  if (tienePendientes) return "NECESITA_ATENCION";

  const aprobados = colaborador.objetivos.filter((o) => o.estadoAprobacion === "APROBADO");
  const faltaSeguimiento =
    referenciaNumero !== null &&
    aprobados.some((o) => !o.seguimientos.some((s) => s.numero === referenciaNumero));
  if (faltaSeguimiento) return "NECESITA_ATENCION";

  return "AL_DIA";
}

const CLASE_PUNTO_ESTADO: Record<EstadoColaborador, string> = {
  AL_DIA: "bg-success",
  NECESITA_ATENCION: "bg-danger",
  SIN_OBJETIVOS: "bg-iib-secondary",
};

export function TarjetaJefe({ jefe }: { jefe: MiEquipo["jefe"] }) {
  return (
    <Link
      href="/mis-objetivos"
      className="flex items-center gap-4 rounded-card bg-iib-surface p-5 shadow-card transition hover:shadow-lg"
    >
      <Avatar
        usuarioId={jefe.usuarioId}
        nombre={jefe.nombre}
        tieneFoto={jefe.tieneFoto}
        size="h-14 w-14"
        fallbackClassName="bg-iib-primary text-white"
        fallbackTextSize="text-lg"
      />
      <div className="flex flex-col gap-0.5">
        <p className="text-base font-semibold text-iib-foreground">{jefe.nombre}</p>
        {jefe.cargo && <p className="text-sm text-iib-secondary">{jefe.cargo}</p>}
        {jefe.gerenciaNombre && <p className="text-xs text-iib-secondary">{jefe.gerenciaNombre}</p>}
      </div>
      <span className="ml-auto shrink-0 rounded-md border border-iib-border px-3 py-1.5 text-xs font-semibold text-iib-foreground">
        Ver mis objetivos →
      </span>
    </Link>
  );
}

export function TarjetaColaborador({
  colaborador,
  referenciaNumero,
  seleccionado,
  onClick,
}: {
  colaborador: ColaboradorEquipo;
  referenciaNumero: number | null;
  seleccionado: boolean;
  onClick: () => void;
}) {
  const estado = estadoColaborador(colaborador, referenciaNumero);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-card border bg-iib-surface p-4 text-left shadow-card transition hover:shadow-lg ${
        seleccionado ? "border-iib-primary ring-2 ring-iib-primary/20" : "border-transparent"
      }`}
    >
      <div className="relative shrink-0">
        <Avatar
          usuarioId={colaborador.usuarioId}
          nombre={colaborador.nombre}
          tieneFoto={colaborador.tieneFoto}
          size="h-11 w-11"
          fallbackClassName="bg-iib-surface-sunken text-iib-secondary"
        />
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-iib-surface ${CLASE_PUNTO_ESTADO[estado]}`}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-sm font-semibold text-iib-foreground">{colaborador.nombre}</p>
        {colaborador.cargo && <p className="truncate text-xs text-iib-secondary">{colaborador.cargo}</p>}
      </div>
    </button>
  );
}

function clasificacion(objetivo: ObjetivoEquipoVista): {
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

function BitacoraSeguimiento({ objetivo }: { objetivo: ObjetivoEquipoVista }) {
  if (objetivo.seguimientos.length === 0) {
    return <p className="text-xs text-iib-secondary">Aún sin seguimiento registrado.</p>;
  }

  return (
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
  );
}

function DetalleObjetivo({ objetivo }: { objetivo: ObjetivoEquipoVista }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
        <div className="flex flex-col gap-0.5">
          <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-iib-secondary">
            Descripción
          </p>
          <p className="text-sm leading-relaxed">{objetivo.descripcion}</p>
        </div>
        {objetivo.acciones && (
          <div className="flex flex-col gap-0.5">
            <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-iib-secondary">
              Acciones
            </p>
            <p className="text-sm leading-relaxed">{objetivo.acciones}</p>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-iib-secondary">
          Indicador
        </p>
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
}

function EncabezadoObjetivo({ objetivo }: { objetivo: ObjetivoEquipoVista }) {
  const clase = clasificacion(objetivo);
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          {clase && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-white ${clase.colorPill}`}
            >
              {clase.tipoTexto}
            </span>
          )}
          <span className="text-sm font-semibold">{objetivo.titulo}</span>
        </div>
        {clase && <span className={`text-xs font-medium ${clase.colorTexto}`}>{clase.detalle}</span>}
      </div>
    </div>
  );
}

function ObjetivoPendienteRow({ objetivo }: { objetivo: ObjetivoEquipoVista }) {
  const colorBorde = clasificacion(objetivo)?.colorBorde ?? "border-l-transparent";
  return (
    <div
      className={`flex flex-col gap-2 border-b border-b-iib-border border-l-4 py-3.5 pl-3 last:border-b-0 ${colorBorde}`}
    >
      <EncabezadoObjetivo objetivo={objetivo} />
      <DetalleObjetivo objetivo={objetivo} />
    </div>
  );
}

function ObjetivoAprobadoRow({ objetivo, franja }: { objetivo: ObjetivoEquipoVista; franja: FranjaUI }) {
  const enCurso = franja.seguimientoEnCurso;
  const yaTieneRegistroDeEste = enCurso
    ? objetivo.seguimientos.some((s) => s.numero === enCurso.numero)
    : false;
  const colorBorde = clasificacion(objetivo)?.colorBorde ?? "border-l-transparent";

  return (
    <div
      className={`flex flex-col gap-2.5 border-b border-b-iib-border border-l-4 py-3.5 pl-3 last:border-b-0 ${colorBorde}`}
    >
      <EncabezadoObjetivo objetivo={objetivo} />
      <DetalleObjetivo objetivo={objetivo} />

      <BitacoraSeguimiento objetivo={objetivo} />

      {franja.cumplimientoEnCurso ? (
        <div className="flex justify-end">
          <CalificacionFinalControl objetivo={objetivo} />
        </div>
      ) : (
        <>
          <CumplimientoLectura cumplido={objetivo.cumplido} cumplioDesarrollo={objetivo.cumplioDesarrollo} />
          {enCurso && (
            <div className="flex justify-end">
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
                accion={accionRegistrarSeguimiento.bind(null, objetivo.id)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function ColaboradorPanel({ colaborador, franja }: { colaborador: ColaboradorEquipo; franja: FranjaUI }) {
  const pendientes = colaborador.objetivos.filter((o) => o.estadoAprobacion === "PENDIENTE_APROBACION");
  const aprobados = colaborador.objetivos.filter((o) => o.estadoAprobacion === "APROBADO");
  const devueltos = colaborador.objetivos.filter((o) => o.estadoAprobacion === "DEVUELTO");

  const sinRegistroDeReferencia =
    franja.referenciaNumero === null
      ? 0
      : aprobados.filter((o) => !o.seguimientos.some((s) => s.numero === franja.referenciaNumero)).length;

  return (
    <article className="flex flex-col gap-4 rounded-card bg-iib-surface p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">{colaborador.nombre}</h3>
          {colaborador.cargo && <p className="text-xs text-iib-secondary">{colaborador.cargo}</p>}
        </div>
        {sinRegistroDeReferencia > 0 && franja.referenciaNumero !== null && (
          <span className="rounded-full bg-warning-bg px-2.5 py-1 text-xs font-semibold text-warning">
            {sinRegistroDeReferencia} sin registro en el seguimiento {franja.referenciaNumero}
          </span>
        )}
      </div>

      {colaborador.objetivos.length === 0 && (
        <p className="text-sm text-iib-secondary">Aún no ha propuesto sus objetivos individuales.</p>
      )}

      {devueltos.length > 0 && pendientes.length === 0 && (
        <p className="text-sm text-iib-secondary">
          Le devolviste su propuesta de objetivos. Está a la espera de que la reenvíe.
        </p>
      )}

      {pendientes.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-iib-secondary">
            Objetivos individuales propuestos ({pendientes.length})
          </p>
          <div className="rounded-md border border-iib-border px-3.5">
            {pendientes.map((objetivo) => (
              <ObjetivoPendienteRow key={objetivo.id} objetivo={objetivo} />
            ))}
          </div>
          <div className="flex justify-end gap-2.5 pt-1">
            <DialogDevolverConComentario
              etiquetaBoton="Devolver"
              titulo={`Devolver los objetivos de ${colaborador.nombre}`}
              placeholder="Explica qué debe ajustar antes de volver a enviarlos…"
              accion={accionDevolverObjetivos.bind(null, colaborador.usuarioId)}
            />
            <BotonAccionSimple
              etiqueta="Aprobar objetivos"
              etiquetaEnviando="Aprobando…"
              accion={accionAprobarObjetivos.bind(null, colaborador.usuarioId)}
            />
          </div>
        </div>
      )}

      {aprobados.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold uppercase tracking-wide text-iib-secondary">
            Objetivos aprobados ({aprobados.length})
          </p>
          <div className="rounded-md border border-iib-border px-3.5">
            {aprobados.map((objetivo) => (
              <ObjetivoAprobadoRow key={objetivo.id} objetivo={objetivo} franja={franja} />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
