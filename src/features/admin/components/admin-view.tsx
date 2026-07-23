"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Egreso } from "@/types/database";
import type { EstadoResultados } from "../queries";
import { PeriodSelector } from "./period-selector";
import { EstadoResultadosPanel } from "./estado-resultados-panel";
import { ExportarResultados } from "./exportar-resultados";
import { EgresosPanel } from "./egresos-panel";

export function AdminView({
  estado,
  compras,
  erogaciones,
}: {
  estado: EstadoResultados;
  compras: Egreso[];
  erogaciones: Egreso[];
}) {
  return (
    <Tabs defaultValue="resultados" className="space-y-4">
      <TabsList>
        <TabsTrigger value="resultados">Estado de resultados</TabsTrigger>
        <TabsTrigger value="compras">Compras</TabsTrigger>
        <TabsTrigger value="erogaciones">Erogaciones</TabsTrigger>
      </TabsList>

      <TabsContent value="resultados" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <PeriodSelector desde={estado.desde} hasta={estado.hasta} />
          <ExportarResultados estado={estado} />
        </div>
        <EstadoResultadosPanel estado={estado} />
      </TabsContent>

      <TabsContent value="compras">
        <EgresosPanel egresos={compras} tipo="compra" />
      </TabsContent>

      <TabsContent value="erogaciones">
        <EgresosPanel egresos={erogaciones} tipo="erogacion" />
      </TabsContent>
    </Tabs>
  );
}
