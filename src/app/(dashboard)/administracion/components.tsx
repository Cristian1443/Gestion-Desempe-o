import { formatearFecha } from "@/lib/fecha";
import { estadoFranja, hoyEnBogota } from "@/lib/franja";
import { BotonAccionSimple } from "@/components/AccionesSimples";
import { accionAbrirPeriodo, accionCerrarPeriodo } from "./actions";
import { AgregarSeguimientoForm } from "./AgregarSeguimientoForm";
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
