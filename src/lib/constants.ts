import type {
  CategoriaProducto,
  CondicionFiscal,
  EstadoPedido,
  OrigenPedido,
  TipoComprobante,
} from "@/types/database";

/**
 * Configuración central de estados de pedido: etiqueta legible, orden en el
 * flujo y clases de color (Tailwind) para badges y columnas del kanban.
 */
export const ESTADOS_PEDIDO: Record<
  EstadoPedido,
  { label: string; orden: number; badge: string; dot: string }
> = {
  cotizado: {
    label: "Cotizado",
    orden: 1,
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
  },
  confirmado: {
    label: "Confirmado",
    orden: 2,
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  en_produccion: {
    label: "En producción",
    orden: 3,
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
  },
  despachado: {
    label: "Despachado",
    orden: 4,
    badge: "bg-violet-100 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
  },
  facturado: {
    label: "Facturado",
    orden: 5,
    badge: "bg-green-100 text-green-700 border-green-200",
    dot: "bg-green-500",
  },
  cancelado: {
    label: "Cancelado",
    orden: 6,
    badge: "bg-red-100 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
};

export const ESTADOS_PEDIDO_LIST = (
  Object.keys(ESTADOS_PEDIDO) as EstadoPedido[]
).sort((a, b) => ESTADOS_PEDIDO[a].orden - ESTADOS_PEDIDO[b].orden);

export const CATEGORIAS_PRODUCTO: Record<CategoriaProducto, string> = {
  gel_refrigerante: "Gel refrigerante",
  sachet: "Sachet",
  bolsa: "Bolsa",
};

export const CONDICIONES_FISCALES: Record<CondicionFiscal, string> = {
  responsable_inscripto: "Responsable Inscripto",
  monotributo: "Monotributo",
  consumidor_final: "Consumidor Final",
  exento: "Exento",
};

export const ORIGENES_PEDIDO: Record<OrigenPedido, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  telefono: "Teléfono",
};

export const TIPOS_COMPROBANTE: Record<TipoComprobante, string> = {
  remito: "Remito",
  factura: "Factura",
};

export const EMPRESA = {
  nombre: process.env.NEXT_PUBLIC_EMPRESA_NOMBRE ?? "Dimar SRL",
  cuit: process.env.NEXT_PUBLIC_EMPRESA_CUIT ?? "",
  direccion: process.env.NEXT_PUBLIC_EMPRESA_DIRECCION ?? "",
  email: process.env.NEXT_PUBLIC_EMPRESA_EMAIL ?? "",
  telefono: process.env.NEXT_PUBLIC_EMPRESA_TELEFONO ?? "",
};
