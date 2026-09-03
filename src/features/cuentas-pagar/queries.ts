import { createClient } from "@/lib/supabase/server";
import type { FacturaCompra } from "@/types/database";

export type EstadoPago = "pagada" | "vencido" | "por_vencer" | "al_dia";

export type FacturaCompraRow = FacturaCompra & {
  pagado: number;
  saldo: number;
  estado: EstadoPago;
  diasParaVencer: number | null; // null si no tiene vencimiento
};

export type ProveedorSaldo = { proveedor: string; saldo: number; facturas: number };

export type CuentasPagar = {
  facturas: FacturaCompraRow[];
  porProveedor: ProveedorSaldo[];
  totalAPagar: number;
  totalVencido: number;
  totalPorVencer: number;
};

const DIAS_POR_VENCER = 7;

export async function getCuentasPagar(): Promise<CuentasPagar> {
  const supabase = await createClient();
  const [factRes, pagosRes] = await Promise.all([
    supabase.from("facturas_compra").select("*").order("fecha", { ascending: false }),
    supabase.from("pagos_compra").select("factura_compra_id, monto"),
  ]);
  if (factRes.error) throw new Error(factRes.error.message);
  if (pagosRes.error) throw new Error(pagosRes.error.message);

  const pagadoPorFactura = new Map<string, number>();
  for (const p of pagosRes.data ?? []) {
    pagadoPorFactura.set(
      p.factura_compra_id,
      (pagadoPorFactura.get(p.factura_compra_id) ?? 0) + Number(p.monto),
    );
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const facturas: FacturaCompraRow[] = (factRes.data ?? []).map((f) => {
    const monto = Number(f.monto);
    const pagado = Math.min(monto, pagadoPorFactura.get(f.id) ?? 0);
    const saldo = monto - pagado;
    let estado: EstadoPago;
    let diasParaVencer: number | null = null;
    if (saldo <= 0.01) {
      estado = "pagada";
    } else if (f.vencimiento) {
      diasParaVencer = Math.round(
        (new Date(f.vencimiento + "T00:00:00").getTime() - hoy.getTime()) / 86400000,
      );
      estado = diasParaVencer < 0 ? "vencido" : diasParaVencer <= DIAS_POR_VENCER ? "por_vencer" : "al_dia";
    } else {
      estado = "al_dia";
    }
    return { ...f, pagado, saldo, estado, diasParaVencer };
  });

  // Saldo por proveedor.
  const prov = new Map<string, ProveedorSaldo>();
  for (const f of facturas) {
    if (f.saldo <= 0.01) continue;
    const key = f.proveedor;
    const cur = prov.get(key) ?? { proveedor: key, saldo: 0, facturas: 0 };
    cur.saldo += f.saldo;
    cur.facturas += 1;
    prov.set(key, cur);
  }

  return {
    facturas,
    porProveedor: [...prov.values()].sort((a, b) => b.saldo - a.saldo),
    totalAPagar: facturas.reduce((a, f) => a + f.saldo, 0),
    totalVencido: facturas.filter((f) => f.estado === "vencido").reduce((a, f) => a + f.saldo, 0),
    totalPorVencer: facturas.filter((f) => f.estado === "por_vencer").reduce((a, f) => a + f.saldo, 0),
  };
}
