"use client";

import * as React from "react";
import { toast } from "sonner";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ClienteConSaldo } from "../queries";

export function DescargarPendientes({ clientes }: { clientes: ClienteConSaldo[] }) {
  const [loading, setLoading] = React.useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      // Carga @react-pdf/renderer solo al hacer clic (no pesa en el bundle inicial).
      const [{ pdf }, { PendientesPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./pendientes-pdf"),
      ]);
      const blob = await pdf(<PendientesPDF clientes={clientes} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pendientes-de-cobro-${new Date().toISOString().slice(0, 10)}.pdf`;
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
      Descargar pendientes (PDF)
    </Button>
  );
}
