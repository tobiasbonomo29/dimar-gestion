import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPedidos } from "@/features/pedidos/queries";
import { PedidosView } from "@/features/pedidos/components/pedidos-view";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const pedidos = await getPedidos();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
          <p className="text-sm text-muted-foreground">
            {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"}.
          </p>
        </div>
        <Button asChild>
          <Link href="/pedidos/nuevo">
            <Plus className="h-4 w-4" />
            Nuevo pedido
          </Link>
        </Button>
      </div>

      <PedidosView pedidos={pedidos} />
    </div>
  );
}
