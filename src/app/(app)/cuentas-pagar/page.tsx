import { getCuentasPagar } from "@/features/cuentas-pagar/queries";
import { CuentasPagarView } from "@/features/cuentas-pagar/components/cuentas-pagar-view";

export const dynamic = "force-dynamic";

export default async function CuentasPagarPage() {
  const data = await getCuentasPagar();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cuentas a pagar</h1>
        <p className="text-sm text-muted-foreground">
          Cargá tus facturas de compra y mirá cuánto debés y a quién, con sus vencimientos.
        </p>
      </div>
      <CuentasPagarView data={data} />
    </div>
  );
}
