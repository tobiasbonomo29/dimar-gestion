import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getClientes } from "@/features/clientes/queries";
import { getProductos } from "@/features/productos/queries";
import { getVendedores } from "@/features/vendedores/queries";
import { getPedido } from "@/features/pedidos/queries";
import { PedidoForm } from "@/features/pedidos/components/pedido-form";
import type { PedidoFormValues } from "@/features/pedidos/schema";

export const dynamic = "force-dynamic";

export default async function EditarPedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [pedido, clientes, catalogo, vendedores] = await Promise.all([
    getPedido(id),
    getClientes(),
    getProductos(),
    getVendedores(true),
  ]);
  if (!pedido) notFound();
  // Solo los cotizados se editan; el resto vuelve al detalle.
  if (pedido.estado !== "cotizado") redirect(`/pedidos/${id}`);

  const initialValues: PedidoFormValues = {
    cliente_id: pedido.cliente_id,
    vendedor_id: pedido.vendedor_id ?? "",
    origen: pedido.origen ?? "",
    fecha_estimada_entrega: pedido.fecha_estimada_entrega ?? "",
    descuento_porcentaje: String(pedido.descuento_porcentaje ?? 0),
    iva_porcentaje: String(pedido.iva_porcentaje ?? 21),
    notas: pedido.notas ?? "",
    items: pedido.pedido_items.map((it) => ({
      producto_id: it.producto_id,
      variante_id: it.variante_id,
      descripcion: it.descripcion,
      cantidad: String(it.cantidad),
      precio_unitario: String(it.precio_unitario),
    })),
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/pedidos/${id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al pedido
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Editar pedido #{pedido.numero}</h1>
        <p className="text-sm text-muted-foreground">
          Cambiá cantidades, precios, ítems, descuento o IVA. Solo se puede mientras esté cotizado.
        </p>
      </div>

      <PedidoForm
        clientes={clientes}
        catalogo={catalogo}
        vendedores={vendedores}
        pedidoId={id}
        initialValues={initialValues}
      />
    </div>
  );
}
