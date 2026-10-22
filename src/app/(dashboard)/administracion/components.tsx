import { BotonAccionSimple } from "@/components/AccionesSimples";
import { Callout } from "@/components/ui/Callout";
import { Chip, type TonoChip } from "@/components/ui/Chip";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { formatearFecha } from "@/lib/fecha";
import { estadoFranja, hoyEnBogota } from "@/lib/franja";
import { textoSinResultado } from "@/lib/pendientes";
import { accionAbrirPeriodo, accionCerrarPeriodo } from "./actions";
import { AgregarSeguimientoForm } from "./AgregarSeguimientoForm";
import { FranjaCumplimientoForm } from "./FranjaCumplimientoForm";
import { SeguimientoRow } from "./SeguimientoRow";

const ETIQUETA_ESTADO_PERIODO: Record<string, string> = {
  BORRADOR: "Borrador",
  ABIERTO: "Abierto",
  CERRADO: "Cerrado",
};

const TONO_ESTADO_PERIODO: Record<string, TonoChip> = {
  BORRADOR: "neutro",
  ABIERTO: "exito",
  CERRADO: "neutro",
};

export interface CierrePeriodo {
  faltaCargar: string[];
  sinResultado: Record<string, number>;
}

// Los pasos para dejar un periodo funcionando, en orden, con el estado de cada
// uno: así Gestión Humana ve de un vistazo qué falta y qué sigue.
function PasosPeriodo({ pasos }: { pasos: Array<{ titulo: string; detalle: string; hecho: boolean }> }) {
  const actual = pasos.findIndex((p) => !p.hecho);
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Pasos del periodo">
      {pasos.map((paso, i) => {
        const esActual = i === actual;
        return (
          <li
            key={paso.titulo}
            className={`flex gap-3 rounded-md border px-3.5 py-3 ${
              esActual ? "border-iib-primary bg-iib-primary/5" : "border-iib-border bg-iib-surface"
            }`}
          >
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                paso.hecho
                  ? "bg-success text-white"
                  : esActual
                    ? "bg-iib-primary text-white"
                    : "border-2 border-iib-border text-iib-secondary"
              }`}
              aria-hidden
            >
              {paso.hecho ? "✓" : i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-iib-foreground">{paso.titulo}</p>
              <p className="text-xs text-iib-secondary">{paso.hecho ? "Listo" : esActual ? "Es lo que sigue" : paso.detalle}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function EncabezadoBloque({ titulo, ayuda }: { titulo: string; ayuda?: string }) {
  return (
    <div>
      <h4 className="text-sm font-bold text-iib-foreground">{titulo}</h4>
      {ayuda && <p className="text-xs text-iib-secondary">{ayuda}</p>}
    </div>
  );
}

export function PeriodoRow({
  periodo,
  cierre,
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
  // Qué falta para cerrar; solo se calcula para el periodo abierto.
  cierre: CierrePeriodo | null;
}) {
  const hoy = hoyEnBogota();
  const cerrado = periodo.estado === "CERRADO";
  const franjaCumplimiento =
    periodo.cumplimientoInicio && periodo.cumplimientoFin
      ? { inicio: periodo.cumplimientoInicio, fin: periodo.cumplimientoFin }
      : null;

  const faltanteCierre = cierre
    ? [
        ...cierre.faltaCargar.map((f) => `Falta cargar ${f}`),
        ...Object.entries(cierre.sinResultado).map(([nivel, n]) => textoSinResultado(nivel, n)),
      ]
    : [];

  return (
    <Tarjeta className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-iib-foreground">Periodo {periodo.nombre}</h3>
          <p className="text-sm text-iib-secondary">
            {formatearFecha(periodo.fechaInicio)} – {formatearFecha(periodo.fechaFin)}
          </p>
        </div>
        <Chip tono={TONO_ESTADO_PERIODO[periodo.estado] ?? "neutro"}>{ETIQUETA_ESTADO_PERIODO[periodo.estado]}</Chip>
      </div>

      <PasosPeriodo
        pasos={[
          {
            titulo: "Seguimientos",
            detalle: "Agrega al menos uno, con su franja",
            hecho: periodo.seguimientos.length > 0,
          },
          { titulo: "Franja del % final", detalle: "Define cuándo se pone", hecho: franjaCumplimiento !== null },
          { titulo: "Abrir el periodo", detalle: "Cuando lo anterior esté listo", hecho: periodo.estado !== "BORRADOR" },
          { titulo: "Cerrar el periodo", detalle: "Al terminar la evaluación", hecho: cerrado },
        ]}
      />

      {periodo.estado === "ABIERTO" && cierre && (
        faltanteCierre.length === 0 ? (
          <Callout tono="exito" titulo="El periodo está listo para cerrarse">
            Todos los indicadores están cargados y todos los objetivos tienen su resultado.
          </Callout>
        ) : (
          <Callout tono="info" titulo="Antes de cerrar el periodo falta:">
            <ul className="list-disc pl-5">
              {faltanteCierre.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </Callout>
        )
      )}

      <div className="flex flex-col gap-3">
        <EncabezadoBloque
          titulo="Seguimientos del periodo"
          ayuda="Cada uno solo se puede registrar dentro de su franja de fechas; nadie lo abre ni lo cierra a mano."
        />
        {periodo.seguimientos.length === 0 ? (
          <p className="text-sm text-iib-secondary">Todavía no hay seguimientos. Agrega el primero con su franja.</p>
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

      <div className="flex flex-col gap-3">
        <EncabezadoBloque
          titulo="% de cumplimiento final"
          ayuda="El rango de fechas en que jefes, gerentes y Gestión Humana lo ponen en cada objetivo."
        />
        {franjaCumplimiento ? (
          <p className="text-sm">
            Del {formatearFecha(franjaCumplimiento.inicio)} al {formatearFecha(franjaCumplimiento.fin)}
          </p>
        ) : (
          <p className="text-sm text-warning">
            Sin franja.{" "}
            {periodo.estado === "BORRADOR"
              ? "Defínela para poder abrir el periodo."
              : "Nadie puede poner el % de cumplimiento hasta que la definas."}
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
        <div className="flex justify-end border-t border-iib-border pt-4">
          <BotonAccionSimple
            etiqueta="Abrir periodo"
            etiquetaEnviando="Abriendo…"
            accion={accionAbrirPeriodo.bind(null, periodo.id)}
          />
        </div>
      )}

      {periodo.estado === "ABIERTO" && (
        <div className="flex justify-end border-t border-iib-border pt-4">
          <BotonAccionSimple
            etiqueta="Cerrar periodo"
            etiquetaEnviando="Cerrando…"
            variante="ghost"
            accion={accionCerrarPeriodo.bind(null, periodo.id)}
          />
        </div>
      )}
    </Tarjeta>
  );
}
