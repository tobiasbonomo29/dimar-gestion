/**
 * Tipos de la base de datos.
 * Escritos a mano por ahora; regenerar con `npm run db:types` una vez que el
 * proyecto Supabase esté enlazado (supabase gen types typescript).
 */

export type CondicionFiscal =
  | "responsable_inscripto"
  | "monotributo"
  | "consumidor_final"
  | "exento";

export type CategoriaProducto = "gel_refrigerante" | "sachet" | "bolsa";

export type EstadoPedido =
  | "cotizado"
  | "confirmado"
  | "en_produccion"
  | "despachado"
  | "facturado"
  | "cancelado";

export type OrigenPedido = "email" | "whatsapp" | "telefono";

export type TipoComprobante = "remito" | "factura";

export type Cliente = {
  id: string;
  razon_social: string;
  nombre_contacto: string | null;
  email: string | null;
  telefono: string | null;
  condicion_fiscal: CondicionFiscal;
  cuit: string | null;
  direccion: string | null;
  notas: string | null;
  fecha_alta: string;
  created_at: string;
  updated_at: string;
}

export type Producto = {
  id: string;
  codigo: string | null;
  nombre: string;
  categoria: CategoriaProducto;
  descripcion: string | null;
  unidad_medida: string;
  precio_base: number;
  stock: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export type ProductoVariante = {
  id: string;
  producto_id: string;
  nombre: string;
  tamano: string | null;
  presentacion: string | null;
  cantidad_por_bulto: number | null;
  precio: number | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export type Pedido = {
  id: string;
  numero: number;
  cliente_id: string;
  fecha_creacion: string;
  estado: EstadoPedido;
  fecha_estimada_entrega: string | null;
  origen: OrigenPedido | null;
  notas: string | null;
  subtotal: number;
  descuento_porcentaje: number;
  descuento_monto: number;
  iva_porcentaje: number;
  iva_monto: number;
  total: number;
  stock_descontado: boolean;
  created_at: string;
  updated_at: string;
}

export type Comprobante = {
  id: string;
  pedido_id: string;
  tipo: TipoComprobante;
  numero: number;
  fecha: string;
  total: number;
  created_at: string;
}

export type PedidoItem = {
  id: string;
  pedido_id: string;
  producto_id: string | null;
  variante_id: string | null;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  created_at: string;
}

export type HistorialEstado = {
  id: string;
  pedido_id: string;
  estado_anterior: EstadoPedido | null;
  estado_nuevo: EstadoPedido;
  fecha: string;
  nota: string | null;
}

type Row<T> = T;
type Insert<T, Optional extends keyof T> = Omit<T, Optional> & Partial<Pick<T, Optional>>;
type Update<T> = Partial<T>;

export interface Database {
  public: {
    Tables: {
      clientes: {
        Row: Row<Cliente>;
        Insert: Insert<Cliente, "id" | "fecha_alta" | "created_at" | "updated_at" | "condicion_fiscal">;
        Update: Update<Cliente>;
        Relationships: [];
      };
      productos: {
        Row: Row<Producto>;
        Insert: Insert<Producto, "id" | "codigo" | "activo" | "unidad_medida" | "precio_base" | "stock" | "created_at" | "updated_at">;
        Update: Update<Producto>;
        Relationships: [];
      };
      producto_variantes: {
        Row: Row<ProductoVariante>;
        Insert: Insert<ProductoVariante, "id" | "activo" | "created_at" | "updated_at">;
        Update: Update<ProductoVariante>;
        Relationships: [];
      };
      pedidos: {
        Row: Row<Pedido>;
        Insert: Insert<Pedido, "id" | "numero" | "fecha_creacion" | "estado" | "subtotal" | "descuento_monto" | "iva_porcentaje" | "iva_monto" | "total" | "stock_descontado" | "created_at" | "updated_at">;
        Update: Update<Pedido>;
        Relationships: [];
      };
      pedido_items: {
        Row: Row<PedidoItem>;
        Insert: Insert<PedidoItem, "id" | "subtotal" | "created_at">;
        Update: Update<PedidoItem>;
        Relationships: [];
      };
      historial_estado: {
        Row: Row<HistorialEstado>;
        Insert: Insert<HistorialEstado, "id" | "fecha">;
        Update: Update<HistorialEstado>;
        Relationships: [];
      };
      comprobantes: {
        Row: Row<Comprobante>;
        Insert: Insert<Comprobante, "id" | "fecha" | "total" | "created_at">;
        Update: Update<Comprobante>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      descontar_stock_pedido: {
        Args: { p_pedido_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      condicion_fiscal: CondicionFiscal;
      categoria_producto: CategoriaProducto;
      estado_pedido: EstadoPedido;
      origen_pedido: OrigenPedido;
      tipo_comprobante: TipoComprobante;
    };
    CompositeTypes: Record<string, never>;
  };
}
