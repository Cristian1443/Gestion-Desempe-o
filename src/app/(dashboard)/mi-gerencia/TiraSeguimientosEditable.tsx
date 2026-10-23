"use client";

import { useRef, useState } from "react";
import { DialogoAvance, type DialogoAvanceHandle } from "@/components/DialogoAvance";
import { accionRegistrarSeguimientoGerencia } from "./actions";

export interface CasillaSeguimiento {
  numero: number;
  franja: string; // "16 mar 2026 al 31 mar 2026"
  estado: "PROXIMA" | "EN_CURSO" | "FINALIZADA";
  porcentaje: number | null;
  comentario: string | null;
}

// La tira de seguimientos de un indicador de gerencia: una casilla por cada
// seguimiento que definió Talento Humano (3 al año o los que sean). Solo el que
// está en curso hoy se puede registrar o corregir; los pasados se leen y los
// próximos quedan apagados.
export function TiraSeguimientosEditable({
  objetivoId,
  tituloIndicador,
  casillas,
}: {
  objetivoId: string;
  tituloIndicador: string;
  casillas: CasillaSeguimiento[];
}) {
  const dialogo = useRef<DialogoAvanceHandle>(null);
  const [seleccionada, setSeleccionada] = useState<CasillaSeguimiento | null>(null);

  function abrir(casilla: CasillaSeguimiento) {
    setSeleccionada(casilla);
    dialogo.current?.abrir({
      porcentaje: casilla.porcentaje,
      comentario: casilla.comentario,
      corrigiendo: casilla.comentario !== null,
    });
  }

  return (
    <>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Seguimientos">
        {casillas.map((c) => {
          const contenido = (
            <>
              <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-iib-secondary">
                Seguimiento {c.numero}
              </span>
              <span className="text-lg font-bold tabular-nums">
                {c.porcentaje !== null ? `${c.porcentaje}%` : c.estado === "EN_CURSO" ? "+" : "—"}
              </span>
              <span className="text-[0.7rem] leading-tight text-iib-secondary">{c.franja}</span>
            </>
          );
          const enCurso = c.estado === "EN_CURSO";
          const borde = enCurso ? "border-iib-primary ring-2 ring-iib-primary/20" : "border-iib-border";
          const fondo = c.porcentaje !== null ? "bg-iib-surface-sunken" : "bg-iib-surface";

          return (
            <li key={c.numero} className="contents">
              {enCurso ? (
                <button
                  type="button"
                  onClick={() => abrir(c)}
                  aria-label={`${c.comentario !== null ? "Corregir" : "Registrar"} el seguimiento ${c.numero}`}
                  className={`flex flex-col items-center gap-0.5 rounded-md border px-2 py-2 text-center transition hover:bg-iib-surface-sunken ${borde} ${fondo}`}
                >
                  {contenido}
                </button>
              ) : (
                <div
                  className={`flex flex-col items-center gap-0.5 rounded-md border px-2 py-2 text-center ${
                    c.estado === "PROXIMA" ? "opacity-40" : ""
                  } ${borde} ${fondo}`}
                >
                  {contenido}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <DialogoAvance
        ref={dialogo}
        titulo={`Seguimiento ${seleccionada?.numero ?? ""}`}
        subtitulo={`${tituloIndicador} · ${seleccionada?.franja ?? ""}`}
        placeholder="¿Cómo va este indicador en este seguimiento?"
        onGuardar={(porcentaje, comentario) =>
          accionRegistrarSeguimientoGerencia({ objetivoId, porcentaje, comentario })
        }
      />
    </>
  );
}
