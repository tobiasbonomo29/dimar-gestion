import { Suspense } from "react";
import { getClientesConSaldo } from "@/features/clientes/queries";
import { getVendedores } from "@/features/vendedores/queries";
import { ClientesClient } from "@/features/clientes/components/clientes-client";
import { ClientesSearch } from "@/features/clientes/components/clientes-search";
import { DescargarPendientes } from "@/features/clientes/components/descargar-pendientes";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [clientes, vendedores] = await Promise.all([
    getClientesConSaldo(q),
    getVendedores(true),
  ]);
  const totalPorCobrar = clientes.reduce((acc, c) => acc + Math.max(c.saldo, 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          {clientes.length} {clientes.length === 1 ? "cliente" : "clientes"}
          {q ? ` para “${q}”` : ""}
          {totalPorCobrar > 0 ? ` · Total por cobrar: ${formatCurrency(totalPorCobrar)}` : ""}.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Suspense fallback={null}>
          <ClientesSearch />
        </Suspense>
        <DescargarPendientes clientes={clientes} />
      </div>

      <ClientesClient clientes={clientes} vendedores={vendedores} />
    </div>
  );
}
