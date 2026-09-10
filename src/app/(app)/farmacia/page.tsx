import {
  getCostosFijos,
  getEerrConfig,
  getEgresos,
  getEmpleados,
  getEstadoResultados,
  getEvolucion,
  getIngresos,
  getProveedores,
  getSueldos,
} from "@/features/farmacia/queries";
import { esPeriodoValido, periodoActual, periodoLabel, rangoPeriodo } from "@/features/farmacia/periodo";
import { FarmaciaView } from "@/features/farmacia/components/farmacia-view";

export const dynamic = "force-dynamic";

export default async function FarmaciaPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { periodo: qp } = await searchParams;
  // Un ?periodo inválido en la URL no debe romper la página: se cae al mes actual.
  const periodo = esPeriodoValido(qp) ? qp : periodoActual();
  const { desde } = rangoPeriodo(periodo);

  const [
    estado,
    evolucion,
    ventas,
    otros,
    egresos,
    sueldos,
    empleados,
    costosFijos,
    proveedores,
    eerrConfig,
  ] = await Promise.all([
    getEstadoResultados(periodo),
    getEvolucion(periodo),
    getIngresos(periodo, "venta"),
    getIngresos(periodo, "otro"),
    getEgresos(periodo),
    getSueldos(periodo),
    getEmpleados(),
    getCostosFijos(),
    getProveedores(),
    getEerrConfig(periodo),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Farmacia</h1>
        <p className="text-sm text-muted-foreground">
          Administración de la farmacia: facturación, ingresos, egresos, sueldos y estado de
          resultados de {periodoLabel(periodo)}.
        </p>
      </div>

      <FarmaciaView
        periodo={periodo}
        fechaDefault={desde}
        estado={estado}
        evolucion={evolucion}
        ventas={ventas}
        otros={otros}
        egresos={egresos}
        sueldos={sueldos}
        empleados={empleados}
        costosFijos={costosFijos}
        proveedores={proveedores}
        eerrConfig={eerrConfig}
      />
    </div>
  );
}
