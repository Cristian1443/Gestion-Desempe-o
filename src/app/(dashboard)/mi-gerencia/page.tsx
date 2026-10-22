import { AgregarIndicador } from "@/components/AgregarIndicador";
import { TarjetaResumen } from "@/components/indicador-ui";
import { LineaDeTiempoPeriodo } from "@/components/LineaDeTiempoPeriodo";
import { Callout } from "@/components/ui/Callout";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { PageHeader } from "@/components/ui/PageHeader";
import { Seccion } from "@/components/ui/Seccion";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { formatearFecha } from "@/lib/fecha";
import { pluralizar } from "@/lib/pendientes";
import { requireRol } from "@/server/auth/rbac";
import { obtenerMiGerencia } from "@/server/services/gerencia.service";
import { accionCrearIndicadorGerencia } from "./actions";
import { ColaboradorConsolidadoRow, IndicadorGerenciaCard } from "./components";

export default async function MiGerenciaPage() {
  const gerente = await requireRol("GERENTE");
  const datos = await obtenerMiGerencia(gerente.usuarioId);

  if (!datos) {
    return (
      <>
        <PageHeader titulo="Mi gerencia" />
        <EstadoVacio titulo="No hay nada para mostrar todavía">
          No hay un periodo abierto, o tu usuario no está asignado como gerente de ninguna gerencia. Si crees que es un
          error, escribe a Gestión Humana.
        </EstadoVacio>
      </>
    );
  }

  const { indicadores, tope, franjas } = datos;
  const cumplen = indicadores.filter((i) => i.estado === "CUMPLE").length;
  const noCumplen = indicadores.filter((i) => i.estado === "NO_CUMPLE").length;
  const enSeguimiento = indicadores.length - cumplen - noCumplen;
  const faltanPorCargar = Math.max(0, tope - indicadores.length);

  const enCurso = franjas.seguimientoEnCurso;
  const sinRegistroEnCurso = enCurso
    ? indicadores.filter((i) => i.cumplido === null && !i.seguimientos.some((s) => s.numero === enCurso.numero))
    : [];
  const cumplimientoEnCurso = franjas.cumplimiento?.estado === "EN_CURSO";
  const sinResultado = indicadores.filter((i) => i.cumplido === null);

  return (
    <>
      <PageHeader
        titulo="Mi gerencia"
        subtitulo={
          <>
            <strong className="font-semibold text-iib-foreground">{datos.gerencia.nombre}</strong> · Carga y haz el
            seguimiento de los indicadores de tu gerencia, y mira cómo va tu equipo.
          </>
        }
      />

      <LineaDeTiempoPeriodo franjas={franjas} periodo={datos.periodo.nombre} />

      {/* El siguiente paso, en orden de prioridad. */}
      {faltanPorCargar > 0 && (
        <Callout tono="aviso" titulo={`Faltan ${pluralizar(faltanPorCargar, "indicador", "indicadores")} de la gerencia por cargar`}>
          Deben ser {tope}; el periodo no se puede cerrar con menos.
        </Callout>
      )}
      {enCurso && sinRegistroEnCurso.length > 0 && (
        <Callout
          tono="aviso"
          titulo={`Registra el seguimiento ${enCurso.numero}: falta el avance de ${pluralizar(sinRegistroEnCurso.length, "indicador", "indicadores")}`}
        >
          Toca el seguimiento en curso de cada indicador, hasta el {formatearFecha(enCurso.fechaFin)}.
        </Callout>
      )}
      {cumplimientoEnCurso && sinResultado.length > 0 && franjas.cumplimiento && (
        <Callout
          tono="urgente"
          titulo={`Marca el resultado final: falta Cumple o No cumple en ${pluralizar(sinResultado.length, "indicador", "indicadores")}`}
        >
          Puedes hacerlo hasta el {formatearFecha(franjas.cumplimiento.fin)}.
        </Callout>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Resumen de indicadores">
        <TarjetaResumen etiqueta="Indicadores" valor={`${indicadores.length} de ${tope}`} />
        <TarjetaResumen etiqueta="Cumplen" valor={cumplen} />
        <TarjetaResumen etiqueta="No cumplen" valor={noCumplen} />
        <TarjetaResumen etiqueta="En seguimiento" valor={enSeguimiento} destacada />
      </section>

      <Seccion
        titulo="Indicadores de la gerencia"
        descripcion="Sin peso · en cada seguimiento registras su avance y al final marcas Cumple o No cumple."
      >
        {indicadores.length === 0 ? (
          <EstadoVacio titulo="Todavía no hay indicadores">
            Agrega los {tope} indicadores de tu gerencia para empezar el seguimiento.
          </EstadoVacio>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {indicadores.map((indicador) => (
              <IndicadorGerenciaCard key={indicador.id} indicador={indicador} franjas={franjas} />
            ))}
          </div>
        )}

        {faltanPorCargar > 0 && <AgregarIndicador accion={accionCrearIndicadorGerencia} />}
      </Seccion>

      <Seccion
        titulo="Consolidado del equipo"
        contador={pluralizar(datos.colaboradores.length, "colaborador", "colaboradores")}
      >
        {datos.colaboradores.length === 0 ? (
          <EstadoVacio titulo="No hay colaboradores en esta gerencia">
            Gestión Humana asigna a las personas de cada gerencia desde Estructura organizacional.
          </EstadoVacio>
        ) : (
          <Tarjeta relleno="ninguno" className="overflow-hidden">
            {datos.colaboradores.map((colaborador) => (
              <ColaboradorConsolidadoRow key={colaborador.usuarioId} colaborador={colaborador} />
            ))}
          </Tarjeta>
        )}
      </Seccion>
    </>
  );
}
