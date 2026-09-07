"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Factory, Trash2, FileSpreadsheet } from "lucide-react";

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
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/lib/export-excel";
import type { Insumo, RecetaItem } from "@/types/database";
import type { ProduccionConProducto } from "../queries";
import { RecetaFormDialog } from "./receta-form-dialog";
import { ProduccionFormDialog } from "./produccion-form-dialog";
import { eliminarProduccion } from "../actions";

export type ProdItem = {
  id: string;
  codigo: string | null;
  nombre: string;
  unidad_medida: string;
  stock: number;
};

export function ProduccionView({
  productos,
  insumos,
  recetaItems,
  producciones,
}: {
  productos: ProdItem[];
  insumos: Insumo[];
  recetaItems: RecetaItem[];
  producciones: ProduccionConProducto[];
}) {
  const router = useRouter();
  const [editReceta, setEditReceta] = React.useState<ProdItem | null>(null);
  const [nuevaProd, setNuevaProd] = React.useState(false);
  const [delProd, setDelProd] = React.useState<ProduccionConProducto | null>(null);

  const insumoById = React.useMemo(() => new Map(insumos.map((i) => [i.id, i])), [insumos]);
  const recetasPorProducto = React.useMemo(() => {
    const m = new Map<string, RecetaItem[]>();
    for (const r of recetaItems) {
      const arr = m.get(r.producto_id) ?? [];
      arr.push(r);
      m.set(r.producto_id, arr);
    }
    return m;
  }, [recetaItems]);

  const conReceta = productos.filter((p) => (recetasPorProducto.get(p.id) ?? []).length > 0);

  // Capacidad por producto (aislado): min(floor(stock_insumo / consumo_x_unidad)).
  const capacidad = conReceta.map((p) => {
    const lineas = (recetasPorProducto.get(p.id) ?? []).map((r) => {
      const ins = insumoById.get(r.insumo_id);
      const stock = Number(ins?.stock ?? 0);
      const alcanza = Number(r.cantidad) > 0 ? Math.floor(stock / Number(r.cantidad)) : Infinity;
      return {
        nombre: ins ? (ins.presentacion ? `${ins.nombre} · ${ins.presentacion}` : ins.nombre) : "insumo",
        unidad: ins?.unidad_medida ?? "",
        stock,
        cantidad: Number(r.cantidad),
        alcanza,
      };
    });
    const maxUnidades = lineas.length > 0 ? Math.min(...lineas.map((l) => l.alcanza)) : 0;
    const limitante = lineas.find((l) => l.alcanza === maxUnidades)?.nombre ?? "—";
    return { ...p, lineas, maxUnidades, limitante };
  });

  async function borrarProd() {
    if (!delProd) return;
    const r = await eliminarProduccion(delProd.id);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Producción revertida (se repuso la materia prima)");
    router.refresh();
  }

  function exportCapacidad() {
    exportToExcel(
      capacidad.map((c) => ({
        Producto: c.nombre,
        "Stock terminado": c.stock,
        "Máx. producible (u.)": Number.isFinite(c.maxUnidades) ? c.maxUnidades : "",
        Limitante: c.limitante,
      })),
      "capacidad-produccion",
      "Capacidad",
    );
  }

  return (
    <Tabs defaultValue="capacidad" className="space-y-4">
      <TabsList>
        <TabsTrigger value="capacidad">Capacidad</TabsTrigger>
        <TabsTrigger value="recetas">Recetas</TabsTrigger>
        <TabsTrigger value="producciones">Producciones</TabsTrigger>
      </TabsList>

      {/* CAPACIDAD */}
      <TabsContent value="capacidad" className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Cuánto podés producir de cada producto con el stock de insumos actual (aislado por
            producto: asume que fabricás solo ese).
          </p>
          <Button variant="outline" size="sm" onClick={exportCapacidad} disabled={capacidad.length === 0}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Stock terminado</TableHead>
                <TableHead className="text-right">Máx. producible</TableHead>
                <TableHead>Limitante</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {capacidad.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Todavía no hay productos con receta. Cargá recetas en la pestaña “Recetas”.
                  </TableCell>
                </TableRow>
              ) : (
                capacidad.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nombre}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{formatNumber(c.stock)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {Number.isFinite(c.maxUnidades) ? formatNumber(c.maxUnidades) : "—"} u.
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.limitante}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* RECETAS */}
      <TabsContent value="recetas" className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Definí qué consume cada producto por unidad. Los insumos salen del módulo Insumos.
        </p>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Insumos en la receta</TableHead>
                <TableHead className="w-[130px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {productos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    No hay productos en el catálogo.
                  </TableCell>
                </TableRow>
              ) : (
                productos.map((p) => {
                  const n = (recetasPorProducto.get(p.id) ?? []).length;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.codigo ? `${p.codigo} · ` : ""}{p.nombre}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {n > 0 ? n : <span className="italic">sin receta</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setEditReceta(p)}>
                          {n > 0 ? "Editar receta" : "Definir receta"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* PRODUCCIONES */}
      <TabsContent value="producciones" className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Cada producción descuenta la materia prima y suma el stock del producto.
          </p>
          <Button size="sm" onClick={() => setNuevaProd(true)} disabled={conReceta.length === 0}>
            <Factory className="h-4 w-4" />
            Registrar producción
          </Button>
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead className="w-[48px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {producciones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Todavía no registraste producciones.
                  </TableCell>
                </TableRow>
              ) : (
                producciones.map((pr) => (
                  <TableRow key={pr.id}>
                    <TableCell className="text-muted-foreground">{formatDate(pr.fecha)}</TableCell>
                    <TableCell className="font-medium">
                      {pr.productos?.codigo ? `${pr.productos.codigo} · ` : ""}{pr.productos?.nombre ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(pr.cantidad)}</TableCell>
                    <TableCell className="text-muted-foreground">{pr.nota ?? "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                        onClick={() => setDelProd(pr)} aria-label="Revertir">
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

      <RecetaFormDialog
        producto={editReceta}
        insumos={insumos}
        lineasActuales={editReceta ? recetasPorProducto.get(editReceta.id) ?? [] : []}
        onOpenChange={() => setEditReceta(null)}
      />
      <ProduccionFormDialog
        open={nuevaProd}
        onOpenChange={setNuevaProd}
        productos={conReceta}
        recetasPorProducto={recetasPorProducto}
        insumos={insumos}
      />
      <ConfirmDialog
        open={delProd !== null}
        onOpenChange={(o) => !o && setDelProd(null)}
        title="Revertir producción"
        description={delProd ? `Se repondrá la materia prima consumida y se bajará ${formatNumber(delProd.cantidad)} u. del stock terminado.` : undefined}
        confirmLabel="Revertir"
        destructive
        onConfirm={borrarProd}
      />
    </Tabs>
  );
}
