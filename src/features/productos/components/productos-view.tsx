"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProductoConVariantes } from "../queries";
import { getProductoNombre } from "../display";
import { ProductosClient } from "./productos-client";
import { PreciosPlanilla } from "./precios-planilla";

export function ProductosView({ productos }: { productos: ProductoConVariantes[] }) {
  const [q, setQ] = React.useState("");

  const filtrados = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return productos;
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(term) ||
        getProductoNombre(p).toLowerCase().includes(term) ||
        p.codigo?.toLowerCase().includes(term) ||
        p.producto_variantes.some((v) => v.nombre.toLowerCase().includes(term)),
    );
  }, [productos, q]);

  return (
    <Tabs defaultValue="catalogo">
      <TabsList>
        <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
        <TabsTrigger value="precios">Precios en bloque</TabsTrigger>
      </TabsList>

      <TabsContent value="catalogo" className="space-y-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar producto o variante..."
            className="pl-8"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <ProductosClient productos={filtrados} />
      </TabsContent>

      <TabsContent value="precios">
        <PreciosPlanilla productos={productos} />
      </TabsContent>
    </Tabs>
  );
}
