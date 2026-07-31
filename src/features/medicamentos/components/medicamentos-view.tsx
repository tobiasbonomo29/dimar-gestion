"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import type { AlfabetaEstado, Medicamento } from "@/types/database";
import { ImportarDialog } from "./importar-dialog";
import { SincronizarAlfabeta } from "./sincronizar-alfabeta";
import { vaciarMedicamentos } from "../actions";

export function MedicamentosView({
  medicamentos,
  total,
  q,
  alfabeta,
}: {
  medicamentos: Medicamento[];
  total: number;
  q: string;
  alfabeta: Pick<AlfabetaEstado, "ultima_sync" | "ultimolog"> | null;
}) {
  const router = useRouter();
  const [busqueda, setBusqueda] = React.useState(q);
  const [importOpen, setImportOpen] = React.useState(false);
  const [vaciarOpen, setVaciarOpen] = React.useState(false);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/medicamentos${busqueda.trim() ? `?q=${encodeURIComponent(busqueda.trim())}` : ""}`);
  }

  async function handleVaciar() {
    const res = await vaciarMedicamentos();
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Catálogo de medicamentos vaciado");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <SincronizarAlfabeta
        ultimaSync={alfabeta?.ultima_sync ?? null}
        ultimolog={alfabeta?.ultimolog ?? null}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={onSearch} className="flex flex-1 gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por descripción, droga, laboratorio o Nº..."
              className="pl-8"
            />
          </div>
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
        <div className="flex gap-2">
          {total > 0 && (
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => setVaciarOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Vaciar
            </Button>
          )}
          <Button size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Importar lista
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? "medicamento" : "medicamentos"} en el catálogo
        {q ? ` · mostrando coincidencias de “${q}”` : medicamentos.length < total ? ` · mostrando ${medicamentos.length}` : ""}.
      </p>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[90px]">Nº reg.</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Droga</TableHead>
              <TableHead>Laboratorio</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="w-[100px]">Actualizado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {medicamentos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {q
                    ? "Sin coincidencias."
                    : "Todavía no hay medicamentos. Importá la lista de Alfabeta (MF.Dat)."}
                </TableCell>
              </TableRow>
            ) : (
              medicamentos.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium tabular-nums">{m.nro_registro}</TableCell>
                  <TableCell>{m.descripcion}</TableCell>
                  <TableCell className="text-muted-foreground">{m.droga ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{m.laboratorio ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatCurrency(m.precio)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(m.actualizado_en)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ImportarDialog open={importOpen} onOpenChange={setImportOpen} />
      <ConfirmDialog
        open={vaciarOpen}
        onOpenChange={setVaciarOpen}
        title="Vaciar catálogo de medicamentos"
        description={`Se eliminarán los ${total} medicamentos de esta unidad. Podés volver a importarlos desde el archivo de Alfabeta.`}
        confirmLabel="Vaciar"
        destructive
        onConfirm={handleVaciar}
      />
    </div>
  );
}
