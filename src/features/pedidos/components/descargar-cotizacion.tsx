"use client";

import * as React from "react";
import { toast } from "sonner";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEmpresa } from "@/components/empresa-provider";
import type { PedidoDetalle } from "../queries";

export function DescargarCotizacion({ pedido }: { pedido: PedidoDetalle }) {
  const [loading, setLoading] = React.useState(false);
  const empresa = useEmpresa();

  async function handleDownload() {
    setLoading(true);
    try {
      // Carga @react-pdf/renderer solo al hacer clic (no pesa en el bundle inicial).
      const [{ pdf }, { CotizacionPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./cotizacion-pdf"),
      ]);
      const blob = await pdf(<CotizacionPDF pedido={pedido} empresa={empresa} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cotizacion-${String(pedido.numero).padStart(4, "0")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo generar el PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleDownload} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      Descargar cotización (PDF)
    </Button>
  );
}
