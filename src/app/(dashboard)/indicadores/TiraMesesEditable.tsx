"use client";

import { useRef, useState } from "react";
import { DialogoAvance, type DialogoAvanceHandle } from "@/components/DialogoAvance";
import { accionRegistrarAvance } from "./actions";

export interface MesVista {
  mes: string; // "AAAA-MM"
  etiqueta: string; // "octubre 2026"
  corto: string; // "oct"
  porcentaje: number | null;
  comentario: string | null;
  // Ya se puede registrar (hasta el mes en curso).
  registrable: boolean;
  esMesActual: boolean;
}

// La tira de 12 meses de un indicador para quien edita: al tocar un mes que ya
// se puede registrar, abre un único diálogo para escribir (o corregir) su avance:
// el % acumulado y un comentario. Los meses futuros quedan apagados.
export function TiraMesesEditable({
  objetivoId,
  tituloIndicador,
  meses,
}: {
  objetivoId: string;
  tituloIndicador: string;
  meses: MesVista[];
}) {
  const dialogo = useRef<DialogoAvanceHandle>(null);
  const [seleccionado, setSeleccionado] = useState<MesVista | null>(null);

  function abrir(mes: MesVista) {
    setSeleccionado(mes);
    dialogo.current?.abrir({
      porcentaje: mes.porcentaje,
      comentario: mes.comentario,
      corrigiendo: mes.porcentaje !== null,
    });
  }

  return (
    <>
      <ol className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-12" aria-label="Avance por mes">
        {meses.map((m) => {
          const contenido = (
            <>
              <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-iib-secondary">{m.corto}</span>
              <span className="text-sm font-bold tabular-nums">
                {m.porcentaje !== null ? `${m.porcentaje}%` : m.registrable ? "+" : "—"}
              </span>
            </>
          );
          const borde = m.esMesActual ? "border-iib-primary ring-2 ring-iib-primary/20" : "border-iib-border";
          const fondo = m.porcentaje !== null ? "bg-iib-surface-sunken" : "bg-iib-surface";

          return (
            <li key={m.mes} className="contents">
              {m.registrable ? (
                <button
                  type="button"
                  onClick={() => abrir(m)}
                  aria-label={`${m.porcentaje !== null ? "Corregir" : "Registrar"} el avance de ${m.etiqueta}`}
                  className={`flex flex-col items-center gap-0.5 rounded-md border px-1 py-1.5 text-center transition hover:border-iib-primary hover:bg-iib-surface-sunken ${borde} ${fondo}`}
                >
                  {contenido}
                </button>
              ) : (
                <div
                  title={m.etiqueta}
                  className={`flex flex-col items-center gap-0.5 rounded-md border px-1 py-1.5 text-center opacity-40 ${borde} ${fondo}`}
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
        titulo={`Avance de ${seleccionado?.etiqueta ?? ""}`}
        subtitulo={tituloIndicador}
        placeholder="¿Qué se hizo este mes y qué sigue?"
        onGuardar={(porcentaje, comentario) =>
          accionRegistrarAvance({ objetivoId, mes: seleccionado?.mes, porcentaje, comentario })
        }
      />
    </>
  );
}
