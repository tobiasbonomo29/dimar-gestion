import { getPuntosVenta } from "@/features/puntos-venta/queries";
import { PuntosVentaView } from "@/features/puntos-venta/components/puntos-venta-view";

export const dynamic = "force-dynamic";

export default async function PuntosVentaPage() {
  const puntos = await getPuntosVenta();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Puntos de venta</h1>
        <p className="text-sm text-muted-foreground">
          Los comprobantes se numeran por punto de venta (ej. 0002-00000001).
          Elegís el PV al generar cada remito o factura.
        </p>
      </div>
      <PuntosVentaView puntos={puntos} />
    </div>
  );
}
