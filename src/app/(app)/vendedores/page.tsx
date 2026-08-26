import { getVendedores } from "@/features/vendedores/queries";
import { VendedoresView } from "@/features/vendedores/components/vendedores-view";

export const dynamic = "force-dynamic";

export default async function VendedoresPage() {
  const vendedores = await getVendedores();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vendedores</h1>
        <p className="text-sm text-muted-foreground">
          Asigná un vendedor a cada cliente y pedido. A fin de mes, la solapa
          Liquidación de Administración calcula la comisión sobre lo facturado.
        </p>
      </div>
      <VendedoresView vendedores={vendedores} />
    </div>
  );
}
