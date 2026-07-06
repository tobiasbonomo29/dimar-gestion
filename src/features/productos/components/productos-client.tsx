"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CATEGORIAS_PRODUCTO } from "@/lib/constants";
import { formatCurrency, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProductoConVariantes } from "../queries";
import { getProductoNombre } from "../display";
import { ProductoFormDialog } from "./producto-form-dialog";
import { deleteProducto } from "../actions";

export function ProductosClient({ productos }: { productos: ProductoConVariantes[] }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ProductoConVariantes | null>(null);
  const [toDelete, setToDelete] = React.useState<ProductoConVariantes | null>(null);

  async function handleDelete() {
    if (!toDelete) return;
    const result = await deleteProducto(toDelete.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Producto eliminado");
    router.refresh();
  }

  return (
    <>
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nuevo producto
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[90px]">Código</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead className="text-right">Precio base</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Variantes</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[90px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No hay productos. Creá el primero con “Nuevo producto”.
                </TableCell>
              </TableRow>
            ) : (
              productos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.codigo ?? "—"}
                  </TableCell>
                  <TableCell className="font-medium">{getProductoNombre(p)}</TableCell>
                  <TableCell>
                    <Badge className="border-slate-200 bg-slate-100 text-slate-700">
                      {CATEGORIAS_PRODUCTO[p.categoria]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.unidad_medida}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(p.precio_base)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums font-medium",
                      p.stock <= 0 && "text-destructive",
                    )}
                  >
                    {formatNumber(p.stock)}
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    {p.producto_variantes.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {p.producto_variantes.map((v) => v.nombre).join(", ")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.activo ? (
                      <Badge className="border-green-200 bg-green-100 text-green-700">
                        Activo
                      </Badge>
                    ) : (
                      <Badge className="border-slate-200 bg-slate-100 text-slate-500">
                        Inactivo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditing(p);
                          setFormOpen(true);
                        }}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setToDelete(p)}
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProductoFormDialog open={formOpen} onOpenChange={setFormOpen} producto={editing} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Eliminar producto"
        description={`¿Eliminar “${toDelete?.nombre}”? Se borrarán también sus variantes. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}
