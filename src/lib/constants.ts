import type {
  CategoriaProducto,
  CondicionFiscal,
  EstadoPedido,
  MedioPago,
  OrigenPedido,
  TipoComprobante,
  TipoEgreso,
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
  facturado: {
    label: "Facturado",
    orden: 3,
    badge: "bg-green-100 text-green-700 border-green-200",
    dot: "bg-green-500",
  },
  en_produccion: {
    label: "En producción",
    orden: 4,
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
  },
  listo_despachar: {
    label: "Listo para despachar",
    orden: 5,
    badge: "bg-cyan-100 text-cyan-700 border-cyan-200",
    dot: "bg-cyan-500",
  },
  despachado: {
    label: "Despachado",
    orden: 6,
    badge: "bg-violet-100 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
  },
  cancelado: {
    label: "Cancelado",
    orden: 7,
    badge: "bg-red-100 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
};

export const ESTADOS_PEDIDO_LIST = (
  Object.keys(ESTADOS_PEDIDO) as EstadoPedido[]
).sort((a, b) => ESTADOS_PEDIDO[a].orden - ESTADOS_PEDIDO[b].orden);

/**
 * Estados en los que un pedido "genera deuda" en la cuenta corriente del
 * cliente: a partir de "facturado" (inclusive) el pedido ya fue facturado,
 * sin importar si después avanzó a producción/despacho — la factura ya
 * salió y el cliente debe ese importe hasta que se registre un pago.
 * "cancelado" nunca genera deuda aunque su orden sea el más alto.
 */
export const ESTADOS_GENERAN_DEUDA: EstadoPedido[] = ESTADOS_PEDIDO_LIST.filter(
  (e) => e !== "cancelado" && ESTADOS_PEDIDO[e].orden >= ESTADOS_PEDIDO.facturado.orden,
);

export const MEDIOS_PAGO: Record<MedioPago, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  cheque: "Cheque",
  tarjeta: "Tarjeta",
  otro: "Otro",
};

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

export const TIPOS_EGRESO: Record<TipoEgreso, string> = {
  compra: "Compra",
  erogacion: "Erogación",
};

/** Categorías sugeridas para compras y erogaciones (el usuario puede escribir otra). */
export const CATEGORIAS_EGRESO_SUGERIDAS = [
  "Mercadería",
  "Materia prima",
  "Sueldos",
  "Alquiler",
  "Servicios",
  "Impuestos",
  "Fletes",
  "Mantenimiento",
  "Combustible",
  "Otros",
];

export const EMPRESA = {
  nombre: process.env.NEXT_PUBLIC_EMPRESA_NOMBRE ?? "Dimar SRL",
  cuit: process.env.NEXT_PUBLIC_EMPRESA_CUIT ?? "",
  direccion: process.env.NEXT_PUBLIC_EMPRESA_DIRECCION ?? "",
  email: process.env.NEXT_PUBLIC_EMPRESA_EMAIL ?? "",
  telefono: process.env.NEXT_PUBLIC_EMPRESA_TELEFONO ?? "",
};
