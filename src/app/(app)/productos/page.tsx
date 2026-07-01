import { getProductos } from "@/features/productos/queries";
import { ProductosView } from "@/features/productos/components/productos-view";

export const dynamic = "force-dynamic";

export default async function ProductosPage() {
  const productos = await getProductos();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
        <p className="text-sm text-muted-foreground">
          Catálogo y actualización de precios. {productos.length}{" "}
          {productos.length === 1 ? "producto" : "productos"}.
        </p>
      </div>
      <ProductosView productos={productos} />
    </div>
  );
}
