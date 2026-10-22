// El resultado final ya guardado de un objetivo, en solo lectura: Cumple / No
// cumple (o el sí/no de los objetivos de desarrollo). No muestra nada mientras
// el objetivo no tiene resultado.
export function CumplimientoLectura({
  cumplido,
  cumplioDesarrollo = null,
}: {
  cumplido: boolean | null;
  cumplioDesarrollo?: boolean | null;
}) {
  if (cumplioDesarrollo !== null) {
    return (
      <p className="rounded-md bg-iib-surface-sunken px-3 py-2 text-sm font-medium">
        Resultado: {cumplioDesarrollo ? "cumplido" : "no cumplido"}
      </p>
    );
  }
  if (cumplido === null) return null;

  return (
    <p className="flex items-center gap-2 rounded-md bg-iib-surface-sunken px-3 py-2 text-sm font-medium">
      Resultado final:
      <span
        className={`rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${
          cumplido ? "bg-success text-white" : "bg-danger text-white"
        }`}
      >
        {cumplido ? "Cumple" : "No cumple"}
      </span>
    </p>
  );
}
