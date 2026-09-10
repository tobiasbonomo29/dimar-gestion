"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  FarmCostoFijo,
  FarmEerr,
  FarmEgreso,
  FarmEmpleado,
  FarmIngreso,
  FarmProveedor,
  FarmSueldo,
} from "@/types/database";
import type { EstadoResultadosFarmacia, MesFarmacia } from "../queries";
import { MesSelector } from "./mes-selector";
import { TableroPanel } from "./tablero-panel";
import { IngresosPanel } from "./ingresos-panel";
import { EgresosPanel } from "./egresos-panel";
import { SueldosPanel } from "./sueldos-panel";
import { EmpleadosPanel } from "./empleados-panel";
import { CostosFijosPanel } from "./costos-fijos-panel";
import { ProveedoresPanel } from "./proveedores-panel";
import { EerrPanel } from "./eerr-panel";

export function FarmaciaView({
  periodo,
  fechaDefault,
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
}: {
  periodo: string;
  /** Primer día del mes: fecha por defecto de los formularios de alta. */
  fechaDefault: string;
  estado: EstadoResultadosFarmacia;
  evolucion: MesFarmacia[];
  ventas: FarmIngreso[];
  otros: FarmIngreso[];
  egresos: FarmEgreso[];
  sueldos: FarmSueldo[];
  empleados: FarmEmpleado[];
  costosFijos: FarmCostoFijo[];
  proveedores: FarmProveedor[];
  eerrConfig: FarmEerr | null;
}) {
  const fijosDelMes = egresos.filter((e) => e.rubro === "fijo").length;

  return (
    <div className="space-y-4">
      <MesSelector periodo={periodo} />

      <Tabs defaultValue="tablero" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="tablero">Tablero</TabsTrigger>
          <TabsTrigger value="resultados">Estado de resultados</TabsTrigger>
          <TabsTrigger value="ventas">Ingresos por venta</TabsTrigger>
          <TabsTrigger value="otros">Otros ingresos</TabsTrigger>
          <TabsTrigger value="egresos">Egresos</TabsTrigger>
          <TabsTrigger value="sueldos">Sueldos</TabsTrigger>
          <TabsTrigger value="empleados">Empleados</TabsTrigger>
          <TabsTrigger value="fijos">Costos fijos</TabsTrigger>
          <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
        </TabsList>

        <TabsContent value="tablero">
          <TableroPanel estado={estado} evolucion={evolucion} />
        </TabsContent>

        <TabsContent value="resultados">
          <EerrPanel estado={estado} config={eerrConfig} />
        </TabsContent>

        <TabsContent value="ventas">
          <IngresosPanel ingresos={ventas} tipo="venta" fechaDefault={fechaDefault} />
        </TabsContent>

        <TabsContent value="otros">
          <IngresosPanel ingresos={otros} tipo="otro" fechaDefault={fechaDefault} />
        </TabsContent>

        <TabsContent value="egresos">
          <EgresosPanel egresos={egresos} proveedores={proveedores} fechaDefault={fechaDefault} />
        </TabsContent>

        <TabsContent value="sueldos">
          <SueldosPanel sueldos={sueldos} empleados={empleados} periodo={periodo} />
        </TabsContent>

        <TabsContent value="empleados">
          <EmpleadosPanel empleados={empleados} />
        </TabsContent>

        <TabsContent value="fijos">
          <CostosFijosPanel costos={costosFijos} periodo={periodo} yaGenerados={fijosDelMes} />
        </TabsContent>

        <TabsContent value="proveedores">
          <ProveedoresPanel proveedores={proveedores} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
