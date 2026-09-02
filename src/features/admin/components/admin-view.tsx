"use client";

import { Landmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/format";
import type { AporteCapital, Egreso, Vendedor } from "@/types/database";
import type {
  EstadoResultados,
  Facturacion,
  FacturaImpaga,
  Liquidacion,
  PendienteProducto,
  VentasPorProducto,
  StockInsumos,
} from "../queries";
import { PeriodSelector } from "./period-selector";
import { EstadoResultadosPanel } from "./estado-resultados-panel";
import { ExportarResultados } from "./exportar-resultados";
import { EgresosPanel } from "./egresos-panel";
import { FacturacionPanel } from "./facturacion-panel";
import { PorCobrarPanel } from "./por-cobrar-panel";
import { PendientePanel } from "./pendiente-panel";
import { EstadisticasPanel } from "./estadisticas-panel";
import { AportesPanel } from "./aportes-panel";
import { LiquidacionPanel } from "./liquidacion-panel";

export function AdminView({
  estado,
  compras,
  erogaciones,
  facturacion,
  impagas,
  aportes,
  aportesTotal,
  liquidacion,
  vendedores,
  pendiente,
  ventasProducto,
  stockInsumos,
}: {
  estado: EstadoResultados;
  compras: Egreso[];
  erogaciones: Egreso[];
  facturacion: Facturacion;
  impagas: FacturaImpaga[];
  aportes: AporteCapital[];
  aportesTotal: number;
  liquidacion: Liquidacion;
  vendedores: Vendedor[];
  pendiente: PendienteProducto[];
  ventasProducto: VentasPorProducto;
  stockInsumos: StockInsumos;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PeriodSelector desde={estado.desde} hasta={estado.hasta} />
        <ExportarResultados estado={estado} />
      </div>

      <Tabs defaultValue="resultados" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="resultados">Estado de resultados</TabsTrigger>
          <TabsTrigger value="facturacion">Facturación</TabsTrigger>
          <TabsTrigger value="cobrar">Por cobrar</TabsTrigger>
          <TabsTrigger value="pendiente">Pendiente por producto</TabsTrigger>
          <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
          <TabsTrigger value="liquidacion">Liquidación</TabsTrigger>
          <TabsTrigger value="aportes">Aportes de capital</TabsTrigger>
          <TabsTrigger value="compras">Compras</TabsTrigger>
          <TabsTrigger value="erogaciones">Erogaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="resultados" className="space-y-4">
          <EstadoResultadosPanel estado={estado} />
          {aportesTotal > 0 && (
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Landmark className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="text-sm">
                  <span className="text-muted-foreground">Aportes de capital del período: </span>
                  <span className="font-semibold tabular-nums">{formatCurrency(aportesTotal)}</span>
                  <span className="text-muted-foreground">
                    {" "}— no forman parte del resultado operativo (ver pestaña “Aportes de capital”).
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="facturacion">
          <FacturacionPanel facturacion={facturacion} desde={estado.desde} hasta={estado.hasta} />
        </TabsContent>

        <TabsContent value="cobrar">
          <PorCobrarPanel facturas={impagas} />
        </TabsContent>

        <TabsContent value="pendiente">
          <PendientePanel items={pendiente} />
        </TabsContent>

        <TabsContent value="estadisticas">
          <EstadisticasPanel ventas={ventasProducto} stock={stockInsumos} />
        </TabsContent>

        <TabsContent value="liquidacion">
          <LiquidacionPanel
            liquidacion={liquidacion}
            vendedores={vendedores}
            desde={estado.desde}
            hasta={estado.hasta}
          />
        </TabsContent>

        <TabsContent value="aportes">
          <AportesPanel aportes={aportes} total={aportesTotal} />
        </TabsContent>

        <TabsContent value="compras">
          <EgresosPanel egresos={compras} tipo="compra" />
        </TabsContent>

        <TabsContent value="erogaciones">
          <EgresosPanel egresos={erogaciones} tipo="erogacion" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
