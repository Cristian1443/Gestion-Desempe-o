"use client";

import { useState } from "react";
import { Boton } from "@/components/ui/Boton";
import { FormularioIndicador, type DatosFormularioIndicador } from "./FormularioIndicador";

type Resultado = { ok: true } | { ok: false; error: string };

// Botón + formulario para agregar un indicador (de la empresa o de gerencia). La
// Server Action que lo crea llega por prop.
export function AgregarIndicador({
  accion,
}: {
  accion: (datos: DatosFormularioIndicador) => Promise<Resultado>;
}) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <div>
        <Boton onClick={() => setAbierto(true)}>Agregar indicador</Boton>
      </div>
    );
  }

  return (
    <FormularioIndicador
      etiquetaGuardar="Agregar indicador"
      onCancelar={() => setAbierto(false)}
      onGuardar={async (datos) => {
        const resultado = await accion(datos);
        if (resultado.ok) setAbierto(false);
        return resultado;
      }}
    />
  );
}
