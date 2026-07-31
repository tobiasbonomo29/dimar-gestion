"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, DownloadCloud, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { sincronizarBaseAlfabeta, traerNovedadesAlfabeta } from "../actions";

export function SincronizarAlfabeta({
  ultimaSync,
  ultimolog,
}: {
  ultimaSync: string | null;
  ultimolog: number | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState<"base" | "novedades" | null>(null);

  async function cargarBase() {
    setLoading("base");
    try {
      const res = await sincronizarBaseAlfabeta(false);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Base completa cargada: ${res.data.importados} medicamentos actualizados.`);
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function traerNovedades() {
    setLoading("novedades");
    try {
      const res = await traerNovedadesAlfabeta();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res.data.cambios > 0
          ? `${res.data.cambios} cambio(s) aplicado(s) desde Alfabeta.`
          : "Sin novedades: ya estás al día.",
      );
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm">
          <p className="font-medium">Sincronización con Alfabeta</p>
          <p className="text-xs text-muted-foreground">
            {ultimaSync
              ? `Última actualización: ${formatDateTime(ultimaSync)} · log ${ultimolog}`
              : "Todavía no sincronizaste. Empezá por “Cargar base completa”."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={traerNovedades}
            disabled={loading !== null || !ultimaSync}
          >
            {loading === "novedades" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Actualizar precios (novedades)
          </Button>
          <Button size="sm" onClick={cargarBase} disabled={loading !== null}>
            {loading === "base" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <DownloadCloud className="h-4 w-4" />
            )}
            Cargar base completa
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
