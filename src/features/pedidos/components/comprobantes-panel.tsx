"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Receipt, Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmpresa } from "@/components/empresa-provider";
import { formatDate, formatComprobanteNumero } from "@/lib/format";
import { ESTADOS_PEDIDO, TIPOS_COMPROBANTE } from "@/lib/constants";
import type { Comprobante, TipoComprobante, PuntoVenta } from "@/types/database";
import type { Empresa } from "@/features/unidades/queries";
import type { PedidoDetalle, ComprobanteConPV } from "../queries";
import { generarComprobante } from "../actions";

async function descargarPDF(
  pedido: PedidoDetalle,
  comprobante: Comprobante,
  empresa: Empresa,
  puntoVentaNumero: number,
) {
  const [{ pdf }, { ComprobantePDF }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./comprobante-pdf"),
  ]);
  const blob = await pdf(
    <ComprobantePDF
      pedido={pedido}
      comprobante={comprobante}
      empresa={empresa}
      puntoVentaNumero={puntoVentaNumero}
    />,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${comprobante.tipo}-${formatComprobanteNumero(puntoVentaNumero, comprobante.numero)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ComprobantesPanel({
  pedido,
  puntosVenta,
}: {
  pedido: PedidoDetalle;
  puntosVenta: PuntoVenta[];
}) {
  const router = useRouter();
  const empresa = useEmpresa();
  const activos = React.useMemo(() => puntosVenta.filter((p) => p.activo), [puntosVenta]);
  const [loading, setLoading] = React.useState<TipoComprobante | null>(null);
  const [downloading, setDownloading] = React.useState<string | null>(null);
  const [avanzarEstado, setAvanzarEstado] = React.useState(false);
  const [pvId, setPvId] = React.useState<string>(activos[0]?.id ?? "");

  const pvSeleccionado = activos.find((p) => p.id === pvId);
  const anulado = pedido.estado === "cancelado";
  const sinPV = activos.length === 0;

  async function handleGenerar(tipo: TipoComprobante) {
    if (!pvSeleccionado) {
      toast.error("Elegí un punto de venta.");
      return;
    }
    setLoading(tipo);
    try {
      const result = await generarComprobante(pedido.id, tipo, pvSeleccionado.id, avanzarEstado);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const nro = formatComprobanteNumero(pvSeleccionado.numero, result.data.comprobante.numero);
      toast.success(`${TIPOS_COMPROBANTE[tipo]} N° ${nro} generado`);
      await descargarPDF(pedido, result.data.comprobante, empresa, pvSeleccionado.numero);
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("No se pudo generar el comprobante.");
    } finally {
      setLoading(null);
    }
  }

  async function handleDescargar(comprobante: ComprobanteConPV) {
    setDownloading(comprobante.id);
    try {
      await descargarPDF(pedido, comprobante, empresa, comprobante.puntos_venta?.numero ?? 0);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo generar el PDF.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* Punto de venta */}
      <div className="grid gap-1.5">
        <Label htmlFor="pv" className="text-xs text-muted-foreground">
          Punto de venta
        </Label>
        {sinPV ? (
          <p className="text-xs text-muted-foreground">
            No hay puntos de venta activos.{" "}
            <Link href="/puntos-venta" className="underline">
              Creá uno
            </Link>
            .
          </p>
        ) : (
          <Select value={pvId} onValueChange={setPvId}>
            <SelectTrigger id="pv" className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {activos.map((pv) => (
                <SelectItem key={pv.id} value={pv.id}>
                  {String(pv.numero).padStart(4, "0")}
                  {pv.nombre ? ` · ${pv.nombre}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => handleGenerar("remito")}
          disabled={loading !== null || anulado || sinPV}
        >
          {loading === "remito" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Remito
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => handleGenerar("factura")}
          disabled={loading !== null || anulado || sinPV}
        >
          {loading === "factura" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
          Factura
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="avanzar-estado"
          checked={avanzarEstado}
          onCheckedChange={setAvanzarEstado}
          disabled={loading !== null || anulado}
        />
        <Label htmlFor="avanzar-estado" className="text-xs font-normal text-muted-foreground">
          Mover el pedido en el Kanban al generar (remito → {ESTADOS_PEDIDO.despachado.label},
          factura → {ESTADOS_PEDIDO.facturado.label})
        </Label>
      </div>

      {!pedido.stock_descontado ? (
        <p className="text-xs text-muted-foreground">
          Al generar el remito se descuenta el stock de los productos (la factura no).
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Stock ya descontado para este pedido.</p>
      )}

      {pedido.comprobantes.length > 0 && (
        <div className="space-y-1.5 border-t pt-3">
          {pedido.comprobantes.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 text-sm">
              <span>
                {TIPOS_COMPROBANTE[c.tipo]} N°{" "}
                {c.puntos_venta ? formatComprobanteNumero(c.puntos_venta.numero, c.numero) : c.numero}
                <span className="ml-2 text-xs text-muted-foreground">{formatDate(c.fecha)}</span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleDescargar(c)}
                disabled={downloading === c.id}
                aria-label="Descargar PDF"
              >
                {downloading === c.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
