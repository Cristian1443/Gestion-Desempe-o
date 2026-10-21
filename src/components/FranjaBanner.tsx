import type { ReactNode } from "react";
import { formatearFecha } from "@/lib/fecha";
import { fechaISO, hoyEnBogota } from "@/lib/franja";
import type { ContextoFranjas } from "@/server/services/periodos.service";

const MS_POR_DIA = 24 * 60 * 60 * 1000;

function diasRestantes(fin: Date): number {
  return Math.round((Date.parse(fechaISO(fin)) - Date.parse(hoyEnBogota())) / MS_POR_DIA);
}

function textoDias(dias: number): string {
  if (dias <= 0) return "termina hoy";
  return dias === 1 ? "queda 1 día" : `quedan ${dias} días`;
}

// Resume qué está en curso hoy: el seguimiento (o cuándo es el próximo) y la
// franja del % de cumplimiento.
export function FranjaItems({ franjas }: { franjas: ContextoFranjas }) {
  const { seguimientoEnCurso, proximoSeguimiento, cumplimiento } = franjas;
  const items: Array<{ clave: string; urgente?: boolean; contenido: ReactNode }> = [];

  if (seguimientoEnCurso) {
    const dias = diasRestantes(seguimientoEnCurso.fechaFin);
    items.push({
      clave: "seguimiento",
      urgente: dias <= 3,
      contenido: (
        <>
          Seguimiento <strong className="font-semibold">{seguimientoEnCurso.numero}</strong> en curso · hasta el{" "}
          {formatearFecha(seguimientoEnCurso.fechaFin)} ({textoDias(dias)})
        </>
      ),
    });
  } else if (proximoSeguimiento) {
    items.push({
      clave: "seguimiento",
      contenido: (
        <>
          Próximo seguimiento: <strong className="font-semibold">{proximoSeguimiento.numero}</strong> · del{" "}
          {formatearFecha(proximoSeguimiento.fechaInicio)} al {formatearFecha(proximoSeguimiento.fechaFin)}
        </>
      ),
    });
  } else {
    items.push({ clave: "seguimiento", contenido: <>No hay un seguimiento en curso</> });
  }

  if (cumplimiento) {
    if (cumplimiento.estado === "EN_CURSO") {
      const dias = diasRestantes(cumplimiento.fin);
      items.push({
        clave: "cumplimiento",
        urgente: dias <= 3,
        contenido: (
          <>
            % de cumplimiento en curso · hasta el {formatearFecha(cumplimiento.fin)} ({textoDias(dias)})
          </>
        ),
      });
    } else if (cumplimiento.estado === "PROXIMA") {
      items.push({
        clave: "cumplimiento",
        contenido: (
          <>
            % de cumplimiento: del {formatearFecha(cumplimiento.inicio)} al {formatearFecha(cumplimiento.fin)}
          </>
        ),
      });
    } else {
      items.push({
        clave: "cumplimiento",
        contenido: <>Franja del % de cumplimiento terminada el {formatearFecha(cumplimiento.fin)}</>,
      });
    }
  }

  return (
    <>
      {items.map((item) => (
        <span key={item.clave} className="contents">
          <span className="h-3 w-px bg-iib-border" aria-hidden />
          <span className={item.urgente ? "font-medium text-warning" : undefined}>{item.contenido}</span>
        </span>
      ))}
    </>
  );
}

// Cinta con el periodo y las franjas, para las pantallas que no tienen ya su
// propia cinta de contexto (Mi equipo, Mi gerencia, Administración).
export function FranjaBanner({ periodo, franjas }: { periodo: string; franjas: ContextoFranjas }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-full border border-iib-border bg-iib-surface px-5 py-2.5 text-xs text-iib-secondary shadow-card">
      <span>
        Periodo <strong className="font-semibold text-iib-foreground">{periodo}</strong>
      </span>
      <FranjaItems franjas={franjas} />
    </div>
  );
}
