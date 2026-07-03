"use client";

import * as React from "react";
import { toast } from "sonner";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CuentaCorriente } from "../queries";

export function DescargarCuentaCorriente({ cuenta }: { cuenta: CuentaCorriente }) {
  const [loading, setLoading] = React.useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      // Carga @react-pdf/renderer solo al hacer clic (no pesa en el bundle inicial).
      const [{ pdf }, { CuentaCorrientePDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./cuenta-corriente-pdf"),
      ]);
      const blob = await pdf(<CuentaCorrientePDF cuenta={cuenta} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const slug = cuenta.cliente.razon_social.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      a.href = url;
      a.download = `cuenta-corriente-${slug}.pdf`;
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
      Descargar cuenta corriente (PDF)
    </Button>
  );
}
