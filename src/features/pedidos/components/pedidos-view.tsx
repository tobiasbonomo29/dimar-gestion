"use client";

import * as React from "react";
import Link from "next/link";

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
import { EstadoBadge } from "@/components/estado-badge";
import { ESTADOS_PEDIDO, ESTADOS_PEDIDO_LIST } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EstadoPedido } from "@/types/database";
import type { PedidoConCliente, CobranzaPedido } from "../queries";
import { CambiarEstado } from "./cambiar-estado";
import { ExportarExcelDialog } from "./exportar-excel-dialog";

export function PedidosView({
  pedidos,
  cobranza,
}: {
  pedidos: PedidoConCliente[];
  cobranza: Record<string, CobranzaPedido>;
}) {
  const [filtro, setFiltro] = React.useState<EstadoPedido | "todos">("todos");

  const filtrados = React.useMemo(
    () => (filtro === "todos" ? pedidos : pedidos.filter((p) => p.estado === filtro)),
    [pedidos, filtro],
  );

  return (
    <Tabs defaultValue="lista">
      <TabsList>
        <TabsTrigger value="lista">Lista</TabsTrigger>
        <TabsTrigger value="kanban">Kanban</TabsTrigger>
      </TabsList>

      {/* LISTA */}
      <TabsContent value="lista" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant={filtro === "todos" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltro("todos")}
            >
              Todos ({pedidos.length})
            </Button>
            {ESTADOS_PEDIDO_LIST.map((e) => {
              const count = pedidos.filter((p) => p.estado === e).length;
              return (
                <Button
                  key={e}
                  variant={filtro === e ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFiltro(e)}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", ESTADOS_PEDIDO[e].dot)} />
                  {ESTADOS_PEDIDO[e].label} ({count})
                </Button>
              );
            })}
          </div>
          <ExportarExcelDialog
            pedidos={filtrados}
            cobranza={cobranza}
            nombreArchivo={filtro === "todos" ? "pedidos" : `pedidos-${filtro}`}
          />
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70px]">N°</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead>Entrega est.</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No hay pedidos en este estado.
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <Link href={`/pedidos/${p.id}`} className="block">#{p.numero}</Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/pedidos/${p.id}`} className="block">
                        {p.clientes?.razon_social ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <Link href={`/pedidos/${p.id}`} className="block">
                        {formatDate(p.fecha_creacion)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <Link href={`/pedidos/${p.id}`} className="block">
                        {formatDate(p.fecha_estimada_entrega)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/pedidos/${p.id}`} className="block">
                        <EstadoBadge estado={p.estado} />
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      <Link href={`/pedidos/${p.id}`} className="block">
                        {formatCurrency(p.total)}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* KANBAN */}
      <TabsContent value="kanban">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {ESTADOS_PEDIDO_LIST.map((estado) => {
            const cards = pedidos.filter((p) => p.estado === estado);
            return (
              <div key={estado} className="w-72 shrink-0">
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span className={cn("h-2 w-2 rounded-full", ESTADOS_PEDIDO[estado].dot)} />
                  <span className="text-sm font-semibold">{ESTADOS_PEDIDO[estado].label}</span>
                  <span className="text-xs text-muted-foreground">({cards.length})</span>
                </div>
                <div className="space-y-2 rounded-lg bg-muted/40 p-2">
                  {cards.length === 0 ? (
                    <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                      Sin pedidos
                    </p>
                  ) : (
                    cards.map((p) => (
                      <div key={p.id} className="rounded-md border bg-background p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/pedidos/${p.id}`}
                            className="text-sm font-medium hover:underline"
                          >
                            #{p.numero} · {p.clientes?.razon_social ?? "—"}
                          </Link>
                        </div>
                        <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                          {formatCurrency(p.total)}
                        </p>
                        {p.fecha_estimada_entrega && (
                          <p className="text-xs text-muted-foreground">
                            Entrega: {formatDate(p.fecha_estimada_entrega)}
                          </p>
                        )}
                        <div className="mt-2">
                          <CambiarEstado pedidoId={p.id} estadoActual={p.estado} size="sm" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </TabsContent>
    </Tabs>
  );
}
