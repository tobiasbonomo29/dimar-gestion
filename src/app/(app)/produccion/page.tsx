import { getProductos } from "@/features/productos/queries";
import { getInsumos } from "@/features/insumos/queries";
import { getRecetaItems, getProducciones } from "@/features/produccion/queries";
import { ProduccionView } from "@/features/produccion/components/produccion-view";

export const dynamic = "force-dynamic";

export default async function ProduccionPage() {
  const [productos, insumos, recetaItems, producciones] = await Promise.all([
    getProductos(),
    getInsumos(),
    getRecetaItems(),
    getProducciones(),
  ]);

  const prodItems = productos.map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    unidad_medida: p.unidad_medida,
    stock: Number(p.stock),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Producción</h1>
        <p className="text-sm text-muted-foreground">
          Recetas por producto, capacidad de producción según el stock de insumos, y registro de
          producciones (descuenta materia prima y suma stock terminado).
        </p>
      </div>
      <ProduccionView
        productos={prodItems}
        insumos={insumos}
        recetaItems={recetaItems}
        producciones={producciones}
      />
    </div>
  );
}
