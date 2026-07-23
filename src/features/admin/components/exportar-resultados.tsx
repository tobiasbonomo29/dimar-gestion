"use client";

import * as React from "react";
import { toast } from "sonner";
import { FileDown, FileSpreadsheet, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useEmpresa } from "@/components/empresa-provider";
import { exportToExcel } from "@/lib/export-excel";
import type { EstadoResultados } from "../queries";

export function ExportarResultados({ estado }: { estado: EstadoResultados }) {
  const empresa = useEmpresa();
  const [pdfLoading, setPdfLoading] = React.useState(false);

  async function handlePDF() {
    setPdfLoading(true);
    try {
      const [{ pdf }, { EstadoResultadosPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./estado-resultados-pdf"),
      ]);
      const blob = await pdf(<EstadoResultadosPDF estado={estado} empresa={empresa} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `estado-resultados-${estado.desde}_${estado.hasta}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo generar el PDF.");
    } finally {
      setPdfLoading(false);
    }
  }

  function handleExcel() {
    const rows = estado.mensual.map((m) => ({
      Mes: m.label,
      Ventas: m.ventas,
      Compras: m.compras,
      Erogaciones: m.erogaciones,
      Resultado: m.resultado,
    }));
    rows.push({
      Mes: "TOTAL",
      Ventas: estado.ventas,
      Compras: estado.compras,
      Erogaciones: estado.erogaciones,
      Resultado: estado.resultado,
    });
    exportToExcel(rows, `estado-resultados-${estado.desde}_${estado.hasta}.xlsx`, "Resultados");
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handlePDF} disabled={pdfLoading}>
        {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
        PDF
      </Button>
      <Button variant="outline" size="sm" onClick={handleExcel}>
        <FileSpreadsheet className="h-4 w-4" />
        Excel
      </Button>
    </div>
  );
}
