import { Suspense } from "react";
import { getClientes } from "@/features/clientes/queries";
import { ClientesClient } from "@/features/clientes/components/clientes-client";
import { ClientesSearch } from "@/features/clientes/components/clientes-search";

export const dynamic = "force-dynamic";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const clientes = await getClientes(q);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          {clientes.length} {clientes.length === 1 ? "cliente" : "clientes"}
          {q ? ` para “${q}”` : ""}.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Suspense fallback={null}>
          <ClientesSearch />
        </Suspense>
      </div>

      <ClientesClient clientes={clientes} />
    </div>
  );
}
