import { getProductos, getCategorias } from "@/features/productos/queries";
import { ProductosView } from "@/features/productos/components/productos-view";

export const dynamic = "force-dynamic";

export default async function ProductosPage() {
  const [productos, categorias] = await Promise.all([getProductos(), getCategorias()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
        <p className="text-sm text-muted-foreground">
          Catálogo y actualización de precios. {productos.length}{" "}
          {productos.length === 1 ? "producto" : "productos"}.
        </p>
      </div>
      <ProductosView productos={productos} categorias={categorias} />
    </div>
  );
}
