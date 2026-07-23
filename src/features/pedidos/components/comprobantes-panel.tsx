"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Receipt, Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useEmpresa } from "@/components/empresa-provider";
import { formatDate } from "@/lib/format";
import { ESTADOS_PEDIDO, TIPOS_COMPROBANTE } from "@/lib/constants";
import type { Comprobante, TipoComprobante } from "@/types/database";
import type { Empresa } from "@/features/unidades/queries";
import type { PedidoDetalle } from "../queries";
import { generarComprobante } from "../actions";

async function descargarPDF(pedido: PedidoDetalle, comprobante: Comprobante, empresa: Empresa) {
  const [{ pdf }, { ComprobantePDF }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./comprobante-pdf"),
  ]);
  const blob = await pdf(
    <ComprobantePDF pedido={pedido} comprobante={comprobante} empresa={empresa} />,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${comprobante.tipo}-${String(comprobante.numero).padStart(4, "0")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ComprobantesPanel({ pedido }: { pedido: PedidoDetalle }) {
  const router = useRouter();
  const empresa = useEmpresa();
  const [loading, setLoading] = React.useState<TipoComprobante | null>(null);
  const [downloading, setDownloading] = React.useState<string | null>(null);
  const [avanzarEstado, setAvanzarEstado] = React.useState(false);

  async function handleGenerar(tipo: TipoComprobante) {
    setLoading(tipo);
    try {
      const result = await generarComprobante(pedido.id, tipo, avanzarEstado);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `${TIPOS_COMPROBANTE[tipo]} N° ${result.data.comprobante.numero} generado`,
      );
      await descargarPDF(pedido, result.data.comprobante, empresa);
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("No se pudo generar el comprobante.");
    } finally {
      setLoading(null);
    }
  }

  async function handleDescargar(comprobante: Comprobante) {
    setDownloading(comprobante.id);
    try {
      await descargarPDF(pedido, comprobante, empresa);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo generar el PDF.");
    } finally {
      setDownloading(null);
    }
  }

  const anulado = pedido.estado === "cancelado";

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => handleGenerar("remito")}
          disabled={loading !== null || anulado}
        >
          {loading === "remito" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          Remito
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => handleGenerar("factura")}
          disabled={loading !== null || anulado}
        >
          {loading === "factura" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Receipt className="h-4 w-4" />
          )}
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
                {TIPOS_COMPROBANTE[c.tipo]} N° {String(c.numero).padStart(4, "0")}
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
