import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRemitos } from "@/features/remitos/queries";
import { RemitosView } from "@/features/remitos/components/remitos-view";

export const dynamic = "force-dynamic";

export default async function RemitosPage() {
  const remitos = await getRemitos();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Remitos</h1>
          <p className="text-sm text-muted-foreground">
            {remitos.length} {remitos.length === 1 ? "remito" : "remitos"} de envío de mercadería.
          </p>
        </div>
        <Button asChild>
          <Link href="/remitos/nuevo">
            <Plus className="h-4 w-4" />
            Nuevo remito
          </Link>
        </Button>
      </div>

      <RemitosView remitos={remitos} />
    </div>
  );
}
