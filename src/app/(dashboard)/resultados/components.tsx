import type {
  CoberturaNivel,
  GerenciaResultado,
  ObjetivoSinSeguimiento,
} from "@/server/services/resultados.service";

const ETIQUETA_NIVEL: Record<ObjetivoSinSeguimiento["nivel"], string> = {
  INDIVIDUAL: "Individual",
  GERENCIA: "Gerencia",
  CORPORATIVO: "Corporativo",
};

export function TarjetaKpi({
  etiqueta,
  cobertura,
}: {
  etiqueta: string;
  cobertura: CoberturaNivel | null;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-card bg-iib-surface p-5 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-iib-secondary">{etiqueta}</p>
      <p className="text-3xl font-bold tabular-nums text-iib-foreground">
        {cobertura === null ? (
          "—"
        ) : (
          <>
            {cobertura.conSeguimiento}
            <span className="text-lg text-iib-secondary">/{cobertura.total}</span>
          </>
        )}
      </p>
    </div>
  );
}

export function FilaGerencia({ gerencia }: { gerencia: GerenciaResultado }) {
  const porcentaje =
    gerencia.objetivosIndividualesTotal === 0
      ? 0
      : Math.round(
          (gerencia.objetivosConSeguimiento / gerencia.objetivosIndividualesTotal) * 100,
        );

  return (
    <div className="flex flex-col gap-2.5 border-b border-iib-border px-4 py-3.5 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{gerencia.nombre}</p>
        <span className="text-xs text-iib-secondary">
          {gerencia.colaboradoresConObjetivos}/{gerencia.colaboradoresTotal} colaboradores con
          objetivos cargados
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="h-[0.45rem] flex-1 overflow-hidden rounded-full bg-iib-surface-sunken">
          <div className="h-full rounded-full bg-iib-primary" style={{ width: `${porcentaje}%` }} />
        </div>
        <span className="min-w-[3.5rem] text-right text-sm font-bold tabular-nums">
          {gerencia.objetivosConSeguimiento}/{gerencia.objetivosIndividualesTotal}
        </span>
      </div>
      <p className="text-xs text-iib-secondary">objetivos individuales con registro en el seguimiento</p>
    </div>
  );
}

export function FilaObjetivoSinSeguimiento({ objetivo }: { objetivo: ObjetivoSinSeguimiento }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-iib-border px-4 py-3.5 last:border-b-0">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">{objetivo.titulo}</p>
        <p className="text-xs text-iib-secondary">
          {ETIQUETA_NIVEL[objetivo.nivel]} · {objetivo.propietario}
        </p>
      </div>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-warning-bg px-2.5 py-1 text-xs font-semibold text-warning">
        <span className="h-2 w-2 rounded-full bg-current" />
        Sin seguimiento
      </span>
    </div>
  );
}
