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

// Las categorías de producto ahora son dinámicas (tabla `categorias`, por unidad).
// productos.categoria guarda el nombre de la categoría como texto.

export type EstadoPedido =
  | "cotizado"
  | "confirmado"
  | "en_produccion"
  | "listo_despachar"
  | "despachado"
  | "facturado"
  | "cancelado";

export type OrigenPedido = "email" | "whatsapp" | "telefono";

export type TipoComprobante = "remito" | "factura";

export type MedioPago = "efectivo" | "transferencia" | "cheque" | "tarjeta" | "otro";

export type TipoEgreso = "compra" | "erogacion";

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
  categoria: string;
  descripcion: string | null;
  unidad_medida: string;
  precio_base: number;
  stock: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export type Categoria = {
  id: string;
  unidad_id: string;
  nombre: string;
  created_at: string;
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

export type Pago = {
  id: string;
  cliente_id: string;
  pedido_id: string | null;
  monto: number;
  fecha: string;
  medio_pago: MedioPago;
  nota: string | null;
  created_at: string;
}

export type Remito = {
  id: string;
  numero: number;
  fecha: string;
  destinatario: string;
  destinatario_direccion: string | null;
  destinatario_cuit: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export type RemitoItem = {
  id: string;
  remito_id: string;
  producto_id: string | null;
  descripcion: string;
  cantidad: number;
  unidad: string | null;
  precio_unitario: number | null;
  created_at: string;
}

export type Medicamento = {
  id: string;
  unidad_id: string;
  nro_registro: string;
  descripcion: string;
  droga: string | null;
  laboratorio: string | null;
  presentacion: string | null;
  precio: number;
  codigo_barras: string | null;
  troquel: string | null;
  activo: boolean;
  actualizado_en: string;
  created_at: string;
  updated_at: string;
}

export type Egreso = {
  id: string;
  unidad_id: string;
  tipo: TipoEgreso;
  fecha: string;
  concepto: string;
  proveedor: string | null;
  categoria: string | null;
  monto: number;
  medio_pago: MedioPago;
  nota: string | null;
  created_at: string;
  updated_at: string;
}

export type Unidad = {
  id: string;
  nombre: string;
  cuit: string | null;
  direccion: string | null;
  email: string | null;
  telefono: string | null;
  created_at: string;
}

export type Perfil = {
  user_id: string;
  unidad_id: string;
  created_at: string;
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
      pagos: {
        Row: Row<Pago>;
        Insert: Insert<Pago, "id" | "pedido_id" | "fecha" | "medio_pago" | "nota" | "created_at">;
        Update: Update<Pago>;
        Relationships: [];
      };
      remitos: {
        Row: Row<Remito>;
        Insert: Insert<Remito, "id" | "numero" | "fecha" | "created_at" | "updated_at">;
        Update: Update<Remito>;
        Relationships: [];
      };
      remito_items: {
        Row: Row<RemitoItem>;
        Insert: Insert<RemitoItem, "id" | "precio_unitario" | "created_at">;
        Update: Update<RemitoItem>;
        Relationships: [];
      };
      egresos: {
        Row: Row<Egreso>;
        Insert: Insert<Egreso, "id" | "unidad_id" | "fecha" | "medio_pago" | "created_at" | "updated_at">;
        Update: Update<Egreso>;
        Relationships: [];
      };
      medicamentos: {
        Row: Row<Medicamento>;
        Insert: Insert<Medicamento, "id" | "unidad_id" | "activo" | "actualizado_en" | "created_at" | "updated_at">;
        Update: Update<Medicamento>;
        Relationships: [];
      };
      unidades: {
        Row: Row<Unidad>;
        Insert: Insert<Unidad, "id" | "created_at">;
        Update: Update<Unidad>;
        Relationships: [];
      };
      perfiles: {
        Row: Row<Perfil>;
        Insert: Insert<Perfil, "created_at">;
        Update: Update<Perfil>;
        Relationships: [];
      };
      categorias: {
        Row: Row<Categoria>;
        Insert: Insert<Categoria, "id" | "unidad_id" | "created_at">;
        Update: Update<Categoria>;
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
      estado_pedido: EstadoPedido;
      origen_pedido: OrigenPedido;
      tipo_comprobante: TipoComprobante;
      medio_pago: MedioPago;
    };
    CompositeTypes: Record<string, never>;
  };
}
