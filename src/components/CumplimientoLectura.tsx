import { cumpleCalificacion } from "@/lib/calificacion";

// El resultado ya guardado de un objetivo, en solo lectura: el % de
// cumplimiento con su "Cumple / No cumple", o el sí/no de los objetivos de
// desarrollo. No muestra nada mientras el objetivo no tiene resultado.
export function CumplimientoLectura({
  calificacionFinal,
  cumplioDesarrollo = null,
}: {
  calificacionFinal: number | null;
  cumplioDesarrollo?: boolean | null;
}) {
  if (cumplioDesarrollo !== null) {
    return (
      <p className="rounded-md bg-iib-surface-sunken px-3 py-2 text-sm font-medium">
        Resultado: {cumplioDesarrollo ? "cumplido" : "no cumplido"}
      </p>
    );
  }
  if (calificacionFinal === null) return null;

  const cumple = cumpleCalificacion(calificacionFinal);
  return (
    <p className="flex items-center gap-2 rounded-md bg-iib-surface-sunken px-3 py-2 text-sm font-medium">
      % de cumplimiento: {calificacionFinal}%
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
