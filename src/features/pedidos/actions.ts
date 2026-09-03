"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/clientes/actions";
import type { EstadoPedido, TipoComprobante, Comprobante } from "@/types/database";
import { ESTADOS_PEDIDO } from "@/lib/constants";
import { pedidoSchema, type PedidoFormValues } from "./schema";

/**
 * Crea un pedido con sus ítems. El pedido nace en estado "cotizado" (default de
 * la DB) y el subtotal/IVA/total se calculan por triggers al insertar los ítems.
 */
export async function createPedido(
  values: PedidoFormValues,
): Promise<ActionResult<{ id: string }>> {
  const parsed = pedidoSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }
  const { items, ...pedido } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pedidos")
    .insert({
      cliente_id: pedido.cliente_id,
      vendedor_id: pedido.vendedor_id ?? null,
      origen: pedido.origen ?? null,
      fecha_estimada_entrega: pedido.fecha_estimada_entrega,
      descuento_porcentaje: pedido.descuento_porcentaje,
      iva_porcentaje: pedido.iva_porcentaje,
      notas: pedido.notas ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  const { error: itemsError } = await supabase.from("pedido_items").insert(
    items.map((it) => ({
      pedido_id: data.id,
      producto_id: it.producto_id ?? null,
      variante_id: it.variante_id ?? null,
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      precio_unitario: it.precio_unitario,
    })),
  );

  if (itemsError) {
    // Revierte el pedido si fallan los ítems (no queda un pedido vacío).
    await supabase.from("pedidos").delete().eq("id", data.id);
    return { ok: false, error: itemsError.message };
  }

  revalidatePath("/pedidos");
  return { ok: true, data: { id: data.id } };
}

/**
 * Cambia el estado de un pedido y registra el movimiento en el historial
 * (con nota opcional). El estado inicial lo registra el trigger al crear.
 */
export async function cambiarEstadoPedido(
  id: string,
  nuevoEstado: EstadoPedido,
  nota?: string,
): Promise<ActionResult> {
  if (!(nuevoEstado in ESTADOS_PEDIDO)) {
    return { ok: false, error: "Estado inválido" };
  }
  const supabase = await createClient();

  // Lee el estado actual para registrar el "estado_anterior" y evitar no-ops.
  const { data: actual, error: readErr } = await supabase
    .from("pedidos")
    .select("estado")
    .eq("id", id)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!actual) return { ok: false, error: "El pedido no existe" };
  if (actual.estado === nuevoEstado) {
    return { ok: false, error: "El pedido ya está en ese estado" };
  }

  // Gate de facturación: para pasar a producción (o más adelante) el pedido
  // tiene que haber sido facturado antes. Si todavía no llegó a "facturado",
  // no puede saltar directo a un estado posterior.
  const facturadoOrden = ESTADOS_PEDIDO.facturado.orden;
  const yaFacturado = ESTADOS_PEDIDO[actual.estado].orden >= facturadoOrden;
  if (
    nuevoEstado !== "cancelado" &&
    ESTADOS_PEDIDO[nuevoEstado].orden > facturadoOrden &&
    !yaFacturado
  ) {
    return {
      ok: false,
      error: "El pedido tiene que estar facturado antes de pasar a producción.",
    };
  }

  const { error: updErr } = await supabase
    .from("pedidos")
    .update({ estado: nuevoEstado })
    .eq("id", id);
  if (updErr) return { ok: false, error: updErr.message };

  const { error: histErr } = await supabase.from("historial_estado").insert({
    pedido_id: id,
    estado_anterior: actual.estado,
    estado_nuevo: nuevoEstado,
    nota: nota?.trim() ? nota.trim() : null,
  });
  if (histErr) return { ok: false, error: histErr.message };

  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${id}`);
  return { ok: true, data: undefined };
}

/**
 * Genera un comprobante (remito/factura) para un pedido:
 *  - asigna número correlativo por tipo,
 *  - si es remito, descuenta el stock una sola vez por pedido (función
 *    idempotente en DB) — la factura no toca stock porque ahora se emite
 *    antes de producción, cuando la mercadería todavía no salió,
 *  - si `avanzarEstado` es true, avanza el estado (factura→facturado,
 *    remito→despachado) cuando corresponde. Por defecto no mueve el pedido:
 *    el movimiento en el Kanban queda en manos del usuario.
 * Devuelve el comprobante creado para poder generar el PDF.
 */
export async function generarComprobante(
  pedidoId: string,
  tipo: TipoComprobante,
  puntoVentaId: string,
  avanzarEstado = false,
): Promise<ActionResult<{ comprobante: Comprobante }>> {
  if (!puntoVentaId) return { ok: false, error: "Elegí un punto de venta." };
  const supabase = await createClient();

  const { data: pedido, error: pedErr } = await supabase
    .from("pedidos")
    .select("id, estado, total")
    .eq("id", pedidoId)
    .maybeSingle();
  if (pedErr) return { ok: false, error: pedErr.message };
  if (!pedido) return { ok: false, error: "El pedido no existe" };
  if (pedido.estado === "cancelado") {
    return { ok: false, error: "No se puede generar un comprobante de un pedido cancelado." };
  }

  // Número correlativo por (punto de venta, tipo).
  const { data: ultimo, error: numErr } = await supabase
    .from("comprobantes")
    .select("numero")
    .eq("tipo", tipo)
    .eq("punto_venta_id", puntoVentaId)
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (numErr) return { ok: false, error: numErr.message };
  const numero = (ultimo?.numero ?? 0) + 1;

  const { data: comprobante, error: insErr } = await supabase
    .from("comprobantes")
    .insert({ pedido_id: pedidoId, punto_venta_id: puntoVentaId, tipo, numero, total: pedido.total })
    .select("*")
    .single();
  if (insErr) return { ok: false, error: insErr.message };

  // Descuenta stock solo en el remito (la mercadería recién sale ahí);
  // idempotente: no repite si ya se descontó para este pedido.
  if (tipo === "remito") {
    const { error: stockErr } = await supabase.rpc("descontar_stock_pedido", {
      p_pedido_id: pedidoId,
    });
    if (stockErr) return { ok: false, error: stockErr.message };
  }

  // Avanza el estado solo hacia adelante, y solo si el usuario lo pidió.
  const destino: EstadoPedido = tipo === "factura" ? "facturado" : "despachado";
  if (avanzarEstado && ESTADOS_PEDIDO[destino].orden > ESTADOS_PEDIDO[pedido.estado].orden) {
    await supabase.from("pedidos").update({ estado: destino }).eq("id", pedidoId);
    await supabase.from("historial_estado").insert({
      pedido_id: pedidoId,
      estado_anterior: pedido.estado,
      estado_nuevo: destino,
      nota: `${tipo === "factura" ? "Factura" : "Remito"} N° ${numero} generado`,
    });
  }

  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${pedidoId}`);
  return { ok: true, data: { comprobante: comprobante as Comprobante } };
}

export type ItemEscaneado = {
  tipo: "producto" | "medicamento";
  producto_id: string | null;
  descripcion: string;
  precio: number;
};

/** Busca un producto o medicamento por su código de barras (unidad actual). */
export async function buscarItemPorCodigoBarras(codigo: string): Promise<ItemEscaneado | null> {
  const c = codigo.trim();
  if (!c) return null;
  const supabase = await createClient();

  const { data: prod } = await supabase
    .from("productos")
    .select("id, nombre, precio_base")
    .eq("codigo_barras", c)
    .eq("activo", true)
    .limit(1)
    .maybeSingle();
  if (prod) {
    return { tipo: "producto", producto_id: prod.id, descripcion: prod.nombre, precio: Number(prod.precio_base) };
  }

  const { data: med } = await supabase
    .from("medicamentos")
    .select("descripcion, presentacion, precio")
    .eq("codigo_barras", c)
    .eq("activo", true)
    .limit(1)
    .maybeSingle();
  if (med) {
    return {
      tipo: "medicamento",
      producto_id: null,
      descripcion: med.presentacion ? `${med.descripcion} · ${med.presentacion}` : med.descripcion,
      precio: Number(med.precio),
    };
  }

  return null;
}

// -----------------------------------------------------------------------------
// Entregas parciales
// -----------------------------------------------------------------------------
export type EntregaInput = {
  fecha?: string;
  nota?: string;
  items: { pedido_item_id: string; cantidad: number }[];
};

/**
 * Registra una entrega (parcial o total): valida que no se entregue más de lo
 * pendiente, guarda el evento en el historial de entregas y suma la cantidad
 * entregada de cada ítem del pedido.
 */
export async function registrarEntrega(
  pedidoId: string,
  input: EntregaInput,
): Promise<ActionResult> {
  const supabase = await createClient();

  // Ítems actuales del pedido (para validar contra el pendiente).
  const { data: items, error: itErr } = await supabase
    .from("pedido_items")
    .select("id, descripcion, cantidad, cantidad_entregada")
    .eq("pedido_id", pedidoId);
  if (itErr) return { ok: false, error: itErr.message };
  const itemMap = new Map((items ?? []).map((i) => [i.id, i]));

  // Filtra y valida las cantidades a entregar.
  const aEntregar: { pedido_item_id: string; descripcion: string; cantidad: number; nuevaEntregada: number }[] = [];
  for (const inp of input.items) {
    const cant = Number(inp.cantidad);
    if (!cant || cant <= 0) continue;
    const it = itemMap.get(inp.pedido_item_id);
    if (!it) return { ok: false, error: "Ítem inválido." };
    const pendiente = Number(it.cantidad) - Number(it.cantidad_entregada);
    if (cant > pendiente + 0.0001) {
      return { ok: false, error: `No podés entregar ${cant} de "${it.descripcion}" (pendiente ${pendiente}).` };
    }
    aEntregar.push({
      pedido_item_id: it.id,
      descripcion: it.descripcion,
      cantidad: cant,
      nuevaEntregada: Number(it.cantidad_entregada) + cant,
    });
  }
  if (aEntregar.length === 0) {
    return { ok: false, error: "Cargá al menos una cantidad a entregar." };
  }

  // Cabecera de la entrega.
  const { data: entrega, error: eErr } = await supabase
    .from("entregas")
    .insert({ pedido_id: pedidoId, nota: input.nota?.trim() ? input.nota.trim() : null, ...(input.fecha ? { fecha: input.fecha } : {}) })
    .select("id")
    .single();
  if (eErr) return { ok: false, error: eErr.message };

  const { error: eiErr } = await supabase.from("entrega_items").insert(
    aEntregar.map((a) => ({
      entrega_id: entrega.id,
      pedido_item_id: a.pedido_item_id,
      descripcion: a.descripcion,
      cantidad: a.cantidad,
    })),
  );
  if (eiErr) {
    await supabase.from("entregas").delete().eq("id", entrega.id);
    return { ok: false, error: eiErr.message };
  }

  // Suma la cantidad entregada de cada ítem.
  for (const a of aEntregar) {
    await supabase
      .from("pedido_items")
      .update({ cantidad_entregada: a.nuevaEntregada })
      .eq("id", a.pedido_item_id);
  }

  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/administracion");
  return { ok: true, data: undefined };
}
