import { Chip } from "@/components/ui/Chip";
import { Tarjeta } from "@/components/ui/Tarjeta";
import type { CoberturaNivel, GerenciaResultado, ObjetivoSinSeguimiento } from "@/server/services/resultados.service";

const ETIQUETA_NIVEL: Record<ObjetivoSinSeguimiento["nivel"], string> = {
  INDIVIDUAL: "Individual",
  GERENCIA: "Gerencia",
  CORPORATIVO: "Corporativo",
};

function porcentajeDe(parte: number, total: number): number {
  return total === 0 ? 0 : Math.round((parte / total) * 100);
}

// Barra de avance con su cifra escrita al lado: el dato no depende del color.
function BarraCobertura({ parte, total, etiqueta }: { parte: number; total: number; etiqueta: string }) {
  const porcentaje = porcentajeDe(parte, total);
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={porcentaje}
      aria-label={etiqueta}
      className="h-2.5 overflow-hidden rounded-full bg-iib-surface-sunken"
    >
      <div className="h-full rounded-full bg-iib-primary" style={{ width: `${porcentaje}%` }} />
    </div>
  );
}

export function TarjetaKpi({ etiqueta, cobertura }: { etiqueta: string; cobertura: CoberturaNivel | null }) {
  return (
    <Tarjeta className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-iib-secondary">{etiqueta}</p>
      {cobertura === null ? (
        <>
          <p className="text-3xl font-bold tabular-nums text-iib-foreground">—</p>
          <p className="text-sm text-iib-secondary">Todavía no hay objetivos de este nivel.</p>
        </>
      ) : (
        <>
          <p className="text-3xl font-bold tabular-nums text-iib-foreground">
            {cobertura.conSeguimiento}
            <span className="text-lg text-iib-secondary">/{cobertura.total}</span>
          </p>
          <BarraCobertura parte={cobertura.conSeguimiento} total={cobertura.total} etiqueta={etiqueta} />
          <p className="text-sm text-iib-secondary">{porcentajeDe(cobertura.conSeguimiento, cobertura.total)} % con registro</p>
        </>
      )}
    </Tarjeta>
  );
}

export function FilaGerencia({ gerencia }: { gerencia: GerenciaResultado }) {
  const porcentaje = porcentajeDe(gerencia.objetivosConSeguimiento, gerencia.objetivosIndividualesTotal);

  return (
    <div className="flex flex-col gap-2.5 border-b border-iib-border px-5 py-4 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-iib-foreground">{gerencia.nombre}</p>
        <span className="text-xs text-iib-secondary">
          {gerencia.colaboradoresConObjetivos}/{gerencia.colaboradoresTotal} colaboradores con objetivos cargados
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <BarraCobertura
            parte={gerencia.objetivosConSeguimiento}
            total={gerencia.objetivosIndividualesTotal}
            etiqueta={`Cobertura de ${gerencia.nombre}`}
          />
        </div>
        <span className="min-w-[5.5rem] text-right text-sm font-bold tabular-nums">
          {gerencia.objetivosConSeguimiento}/{gerencia.objetivosIndividualesTotal} · {porcentaje} %
        </span>
      </div>
      <p className="text-xs text-iib-secondary">objetivos individuales con registro en el seguimiento</p>
    </div>
  );
}

export function FilaObjetivoSinSeguimiento({ objetivo }: { objetivo: ObjetivoSinSeguimiento }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-iib-border px-5 py-3.5 last:border-b-0">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium text-iib-foreground">{objetivo.titulo}</p>
        <p className="text-xs text-iib-secondary">
          {ETIQUETA_NIVEL[objetivo.nivel]} · {objetivo.propietario}
        </p>
      </div>
      <Chip tono="aviso">Sin seguimiento</Chip>
    </div>
  );
}
