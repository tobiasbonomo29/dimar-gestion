import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProductos } from "@/features/productos/queries";
import { RemitoForm } from "@/features/remitos/components/remito-form";

export const dynamic = "force-dynamic";

export default async function NuevoRemitoPage() {
  const catalogo = await getProductos();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/remitos"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a remitos
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo remito</h1>
        <p className="text-sm text-muted-foreground">
          Cargá el destinatario y la mercadería que enviás.
        </p>
      </div>

      <RemitoForm catalogo={catalogo} />
    </div>
  );
}
