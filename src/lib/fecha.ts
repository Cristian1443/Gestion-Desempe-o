// `fechaInicio`, `fechaFin`, `fechaLimite`, etc. son fechas de calendario
// (no un instante con hora significativa), guardadas como medianoche UTC.
// Formatearlas con la zona horaria local del servidor (ej. America/Bogota,
// UTC-5) las corre un día hacia atrás. Por eso se fuerza `timeZone: "UTC"`
// aquí — es la única función que debería formatear estas fechas en toda la
// app, para no repetir (ni olvidar) este detalle en cada componente.
export function formatearFecha(fecha: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(fecha);
}
