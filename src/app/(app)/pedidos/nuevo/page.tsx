import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getClientes } from "@/features/clientes/queries";
import { getProductos } from "@/features/productos/queries";
import { PedidoForm } from "@/features/pedidos/components/pedido-form";

export const dynamic = "force-dynamic";

export default async function NuevoPedidoPage() {
  const [clientes, catalogo] = await Promise.all([
    getClientes(),
    getProductos(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/pedidos"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a pedidos
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo pedido</h1>
        <p className="text-sm text-muted-foreground">
          Elegí el cliente, agregá los ítems y revisá el total.
        </p>
      </div>

      <PedidoForm clientes={clientes} catalogo={catalogo} />
    </div>
  );
}
