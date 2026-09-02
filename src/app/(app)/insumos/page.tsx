import { getInsumos, getCompras } from "@/features/insumos/queries";
import { InventarioView } from "@/features/insumos/components/inventario-view";

export const dynamic = "force-dynamic";

export default async function InsumosPage() {
  const [insumos, compras] = await Promise.all([getInsumos(), getCompras()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventario de insumos</h1>
        <p className="text-sm text-muted-foreground">
          Materia prima e insumos stockeados por presentación, y las compras que los reponen.
        </p>
      </div>
      <InventarioView insumos={insumos} compras={compras} />
    </div>
  );
}
