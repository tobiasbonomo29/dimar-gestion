"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MEDIOS_PAGO } from "@/lib/constants";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Insumo } from "@/types/database";
import type { CompraConItems } from "../queries";
import { InsumoFormDialog } from "./insumo-form-dialog";
import { CompraFormDialog } from "./compra-form-dialog";
import { eliminarInsumo, eliminarCompra } from "../actions";

export function InventarioView({
  insumos,
  compras,
}: {
  insumos: Insumo[];
  compras: CompraConItems[];
}) {
  const router = useRouter();
  const [insumoForm, setInsumoForm] = React.useState(false);
  const [editInsumo, setEditInsumo] = React.useState<Insumo | null>(null);
  const [delInsumo, setDelInsumo] = React.useState<Insumo | null>(null);
  const [compraForm, setCompraForm] = React.useState(false);
  const [delCompra, setDelCompra] = React.useState<CompraConItems | null>(null);

  const bajos = insumos.filter((i) => i.stock_minimo > 0 && i.stock <= i.stock_minimo).length;

  async function borrarInsumo() {
    if (!delInsumo) return;
    const r = await eliminarInsumo(delInsumo.id);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Insumo eliminado");
    router.refresh();
  }
  async function borrarCompra() {
    if (!delCompra) return;
    const r = await eliminarCompra(delCompra.id);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Compra eliminada — stock revertido");
    router.refresh();
  }

  return (
    <Tabs defaultValue="inventario" className="space-y-4">
      <TabsList>
        <TabsTrigger value="inventario">Inventario</TabsTrigger>
        <TabsTrigger value="compras">Compras</TabsTrigger>
      </TabsList>

      {/* INVENTARIO */}
      <TabsContent value="inventario" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {insumos.length} {insumos.length === 1 ? "insumo" : "insumos"}
            {bajos > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" /> {bajos} bajo el mínimo
              </span>
            )}
          </p>
          <Button size="sm" onClick={() => { setEditInsumo(null); setInsumoForm(true); }}>
            <Plus className="h-4 w-4" />
            Nuevo insumo
          </Button>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Insumo</TableHead>
                <TableHead>Presentación</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead className="w-[90px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {insumos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Todavía no hay insumos. Creá el primero con “Nuevo insumo”.
                  </TableCell>
                </TableRow>
              ) : (
                insumos.map((i) => {
                  const bajo = i.stock_minimo > 0 && i.stock <= i.stock_minimo;
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.nombre}</TableCell>
                      <TableCell className="text-muted-foreground">{i.presentacion ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{i.categoria ?? "—"}</TableCell>
                      <TableCell className={cn("text-right font-medium tabular-nums", bajo && "text-amber-700")}>
                        {formatNumber(i.stock)} {i.unidad_medida}
                        {bajo && <AlertTriangle className="ml-1 inline h-3.5 w-3.5" />}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {i.stock_minimo > 0 ? formatNumber(i.stock_minimo) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => { setEditInsumo(i); setInsumoForm(true); }} aria-label="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                            onClick={() => setDelInsumo(i)} aria-label="Eliminar">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* COMPRAS */}
      <TabsContent value="compras" className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {compras.length} {compras.length === 1 ? "compra registrada" : "compras registradas"}.
            Cada compra suma stock y genera un gasto en el estado de resultados.
          </p>
          <Button size="sm" onClick={() => setCompraForm(true)}>
            <Plus className="h-4 w-4" />
            Nueva compra
          </Button>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70px]">N°</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="text-right">Ítems</TableHead>
                <TableHead>Medio</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[48px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {compras.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Todavía no hay compras. Registrá la primera con “Nueva compra”.
                  </TableCell>
                </TableRow>
              ) : (
                compras.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">#{c.numero}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(c.fecha)}</TableCell>
                    <TableCell>{c.proveedor ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{c.compra_items.length}</TableCell>
                    <TableCell className="text-muted-foreground">{MEDIOS_PAGO[c.medio_pago]}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(c.total)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                        onClick={() => setDelCompra(c)} aria-label="Eliminar">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <InsumoFormDialog open={insumoForm} onOpenChange={setInsumoForm} insumo={editInsumo} />
      <CompraFormDialog open={compraForm} onOpenChange={setCompraForm} insumos={insumos} />

      <ConfirmDialog
        open={delInsumo !== null}
        onOpenChange={(o) => !o && setDelInsumo(null)}
        title="Eliminar insumo"
        description={delInsumo ? `Se eliminará "${delInsumo.nombre}". Las compras anteriores no se modifican.` : undefined}
        confirmLabel="Eliminar"
        destructive
        onConfirm={borrarInsumo}
      />
      <ConfirmDialog
        open={delCompra !== null}
        onOpenChange={(o) => !o && setDelCompra(null)}
        title="Eliminar compra"
        description={delCompra ? `Se eliminará la compra #${delCompra.numero}, se revertirá el stock sumado y se borrará su gasto asociado.` : undefined}
        confirmLabel="Eliminar"
        destructive
        onConfirm={borrarCompra}
      />
    </Tabs>
  );
}
