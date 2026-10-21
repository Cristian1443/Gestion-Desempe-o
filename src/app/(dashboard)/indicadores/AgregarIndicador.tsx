"use client";

import { useState } from "react";
import { accionCrearIndicador } from "./actions";
import { FormularioIndicador } from "./FormularioIndicador";

export function AgregarIndicador() {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="rounded-md bg-iib-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-iib-primary-hover"
        >
          Agregar indicador
        </button>
      </div>
    );
  }

  return (
    <FormularioIndicador
      etiquetaGuardar="Agregar indicador"
      onCancelar={() => setAbierto(false)}
      onGuardar={async (datos) => {
        const resultado = await accionCrearIndicador(datos);
        if (resultado.ok) setAbierto(false);
        return resultado;
      }}
    />
  );
}
