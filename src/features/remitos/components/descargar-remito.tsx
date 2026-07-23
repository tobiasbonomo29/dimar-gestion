"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEmpresa } from "@/components/empresa-provider";
import type { Remito, RemitoItem } from "@/types/database";
import type { Empresa } from "@/features/unidades/queries";

type RemitoItemLike = Pick<RemitoItem, "descripcion" | "cantidad" | "unidad" | "precio_unitario">;

/** Genera y descarga el PDF de un remito. Carga @react-pdf/renderer on-demand. */
export async function descargarRemitoPDF(remito: Remito, items: RemitoItemLike[], empresa: Empresa) {
  const [{ pdf }, { RemitoPDF }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./remito-pdf"),
  ]);
  const blob = await pdf(<RemitoPDF remito={remito} items={items} empresa={empresa} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `remito-${String(remito.numero).padStart(4, "0")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function DescargarRemitoButton({
  remito,
  items,
}: {
  remito: Remito;
  items: RemitoItemLike[];
}) {
  const [loading, setLoading] = React.useState(false);
  const empresa = useEmpresa();

  async function handleDownload() {
    setLoading(true);
    try {
      await descargarRemitoPDF(remito, items, empresa);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo generar el PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={handleDownload}
      disabled={loading}
      aria-label="Descargar PDF"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
    </Button>
  );
}
