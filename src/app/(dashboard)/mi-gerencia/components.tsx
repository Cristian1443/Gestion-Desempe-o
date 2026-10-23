import { AccionesIndicador } from "@/components/AccionesIndicador";
import { CumplimientoControl } from "@/components/CumplimientoControl";
import { BarraAvance, CabeceraIndicador } from "@/components/indicador-ui";
import { formatearFecha } from "@/lib/fecha";
import type { ContextoFranjas } from "@/server/services/periodos.service";
import type {
  ColaboradorConsolidado,
  IndicadorGerenciaVista,
} from "@/server/services/gerencia.service";
import {
  accionEditarIndicadorGerencia,
  accionEliminarIndicadorGerencia,
  accionMarcarCumplimientoGerencia,
} from "./actions";
import { TiraSeguimientosEditable, type CasillaSeguimiento } from "./TiraSeguimientosEditable";

export function IndicadorGerenciaCard({
  indicador,
  franjas,
}: {
  indicador: IndicadorGerenciaVista;
  franjas: ContextoFranjas;
}) {
  const casillas: CasillaSeguimiento[] = franjas.todos.map((f) => {
    const registro = indicador.seguimientos.find((s) => s.numero === f.numero);
    return {
      numero: f.numero,
      franja: `${formatearFecha(f.fechaInicio)} al ${formatearFecha(f.fechaFin)}`,
      estado: f.estado,
      porcentaje: registro?.porcentaje ?? null,
      comentario: registro?.comentario ?? null,
    };
  });

  const ultimo = [...indicador.seguimientos].reverse().find((s) => s.porcentaje !== null);
  const cumplimientoEnCurso = franjas.cumplimiento?.estado === "EN_CURSO";

  return (
    <article className="flex flex-col gap-4 rounded-card bg-iib-surface p-5 shadow-card">
      <CabeceraIndicador
        titulo={indicador.titulo}
        descripcion={indicador.descripcion}
        meta={indicador.meta}
        unidadMedida={indicador.unidadMedida}
        lineaEstrategica={indicador.lineaEstrategica}
        estado={indicador.estado}
      />

      <BarraAvance
        titulo={indicador.titulo}
        porcentaje={indicador.ultimoPorcentaje}
        estado={indicador.estado}
        pie={ultimo ? `en el seguimiento ${ultimo.numero}` : null}
      />

      {casillas.length === 0 ? (
        <p className="text-sm text-iib-secondary">Talento Humano todavía no definió los seguimientos del periodo.</p>
      ) : (
        <TiraSeguimientosEditable objetivoId={indicador.id} tituloIndicador={indicador.titulo} casillas={casillas} />
      )}

      {cumplimientoEnCurso && (
        <CumplimientoControl
          objetivoId={indicador.id}
          cumplido={indicador.cumplido}
          accion={accionMarcarCumplimientoGerencia}
        />
      )}

      {indicador.seguimientos.length > 0 && (
        <details className="group rounded-md border border-iib-border">
          <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-iib-secondary hover:text-iib-foreground">
            Historial de seguimientos ({indicador.seguimientos.length})
          </summary>
          <ul className="flex flex-col gap-2 border-t border-iib-border p-3">
            {[...indicador.seguimientos].reverse().map((s) => (
              <li key={s.numero} className="rounded-md bg-iib-surface-sunken px-3 py-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="text-xs font-bold text-iib-foreground">
                    Seguimiento {s.numero}
                    {s.porcentaje !== null ? ` · ${s.porcentaje}%` : ""}
                  </span>
                  <span className="text-xs text-iib-secondary">{formatearFecha(s.fecha)}</span>
                </div>
                <p className="mt-1 text-sm leading-relaxed">{s.comentario}</p>
              </li>
            ))}
          </ul>
        </details>
      )}

      <AccionesIndicador
        objetivoId={indicador.id}
        datos={{
          lineaEstrategica: indicador.lineaEstrategica ?? "",
          descripcion: indicador.descripcion,
          titulo: indicador.titulo,
          meta: indicador.meta,
        }}
        puedeEliminar={indicador.seguimientos.length === 0 && indicador.cumplido === null}
        accionEditar={accionEditarIndicadorGerencia}
        accionEliminar={accionEliminarIndicadorGerencia}
      />
    </article>
  );
}

export function ColaboradorConsolidadoRow({ colaborador }: { colaborador: ColaboradorConsolidado }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-iib-border px-4 py-3.5 last:border-b-0">
      <div>
        <p className="text-sm font-medium">{colaborador.nombre}</p>
        {colaborador.cargo && <p className="text-xs text-iib-secondary">{colaborador.cargo}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-iib-secondary">
        {colaborador.totalObjetivos === 0 ? (
          <span>Sin objetivos propuestos</span>
        ) : (
          <>
            {colaborador.pendientes > 0 && (
              <span className="rounded-full bg-warning-bg px-2.5 py-1 font-semibold text-warning">
                {colaborador.pendientes} pendiente{colaborador.pendientes === 1 ? "" : "s"} de
                aprobación
              </span>
            )}
            <span>
              {colaborador.aprobados}/{colaborador.totalObjetivos} objetivos aprobados
            </span>
            {colaborador.aprobados > 0 && (
              <span className="font-bold tabular-nums text-iib-foreground">
                {colaborador.conSeguimientoDeReferencia}/{colaborador.aprobados} con registro en el
                seguimiento en curso
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
