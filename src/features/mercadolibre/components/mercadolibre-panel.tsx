"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Link2, Loader2, RefreshCw, Unlink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { desconectarMercadoLibre, sincronizarAhora } from "../actions";

export type VentaML = {
  id: string;
  ml_order_id: number;
  estado: "importada" | "error";
  detalle: string | null;
  total: number | null;
  comision: number | null;
  envio: number | null;
  fecha: string | null;
  created_at: string;
  pedido: { id: string; numero: number } | null;
};

const ERRORES: Record<string, string> = {
  config: "Falta configurar las credenciales de la aplicación de Mercado Libre en el servidor.",
  unidad: "No se pudo identificar tu unidad de negocio.",
  autorizacion: "Mercado Libre no devolvió la autorización. Probá de nuevo.",
  state: "El enlace de autorización venció. Probá de nuevo.",
  token: "Mercado Libre rechazó la conexión. Probá de nuevo.",
  cuenta_en_otra_unidad: "Esa cuenta de Mercado Libre ya está vinculada a otra unidad de negocio.",
};

export function MercadoLibrePanel({
  configurado,
  conexion,
  ventas,
  error,
  ok,
}: {
  configurado: boolean;
  conexion: { nickname: string | null; conectado_at: string } | null;
  ventas: VentaML[];
  error?: string;
  ok?: boolean;
}) {
  const router = useRouter();
  const [sync, setSync] = React.useState(false);
  const [confirmar, setConfirmar] = React.useState(false);

  React.useEffect(() => {
    if (ok) toast.success("Cuenta de Mercado Libre conectada");
    if (error) toast.error(ERRORES[error] ?? "No se pudo conectar Mercado Libre");
  }, [ok, error]);

  async function sincronizar() {
    setSync(true);
    const r = await sincronizarAhora();
    setSync(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success(
      r.data.importadas === 0
        ? "Todo al día: no hay ventas nuevas"
        : `${r.data.importadas} venta(s) cargada(s)${r.data.errores ? ` · ${r.data.errores} con error` : ""}`,
    );
    router.refresh();
  }

  async function desconectar() {
    const r = await desconectarMercadoLibre();
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Cuenta desconectada");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cuenta de Mercado Libre</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!configurado ? (
            <p className="text-muted-foreground">
              La integración todavía no está activada en el servidor (faltan las credenciales de la
              aplicación de Mercado Libre).
            </p>
          ) : conexion ? (
            <>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>
                  Conectada como <span className="font-semibold">{conexion.nickname ?? "—"}</span> desde el{" "}
                  {formatDateTime(conexion.conectado_at)}
                </span>
              </div>
              <p className="text-muted-foreground">
                Cada venta cobrada se carga sola como pedido <b>facturado y cobrado</b> del cliente MERCADO LIBRE,
                con la comisión y el envío de ML como erogaciones, y descuenta stock. Las ventas anteriores a la
                conexión no se importan.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={sincronizar} disabled={sync}>
                  {sync ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Sincronizar ahora
                </Button>
                <Button variant="outline" onClick={() => setConfirmar(true)}>
                  <Unlink className="h-4 w-4" />
                  Desconectar
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">
                Conectá la cuenta de Mercado Libre para que cada venta cobrada se cargue automáticamente.
              </p>
              <Button asChild>
                <a href="/api/mercadolibre/conectar">
                  <Link2 className="h-4 w-4" />
                  Conectar Mercado Libre
                </a>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ventas importadas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {ventas.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">Todavía no se importó ninguna venta.</p>
          ) : (
            <div className="divide-y">
              {ventas.map((v) => (
                <div key={v.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 text-sm sm:px-6">
                  <div className="min-w-0">
                    <p className="font-medium">
                      Orden #{v.ml_order_id}
                      {v.pedido && (
                        <>
                          {" · "}
                          <Link href={`/pedidos/${v.pedido.id}`} className="underline">
                            Pedido #{v.pedido.numero}
                          </Link>
                        </>
                      )}
                    </p>
                    <p className={cn("text-xs", v.estado === "error" ? "text-red-600" : "text-muted-foreground")}>
                      {v.estado === "error"
                        ? `Error: ${v.detalle ?? "desconocido"}`
                        : `${formatDateTime(v.fecha ?? v.created_at)} · comisión ${formatCurrency(v.comision)}${
                            Number(v.envio) > 0 ? ` · envío ${formatCurrency(v.envio)}` : ""
                          }`}
                    </p>
                  </div>
                  {v.estado === "importada" && (
                    <span className="font-semibold tabular-nums">{formatCurrency(v.total)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmar}
        onOpenChange={setConfirmar}
        title="Desconectar Mercado Libre"
        description="Las ventas nuevas dejan de cargarse solas. Las que ya se cargaron quedan en el sistema."
        confirmLabel="Desconectar"
        destructive
        onConfirm={desconectar}
      />
    </div>
  );
}
