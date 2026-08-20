"use client";

import * as React from "react";
import { toast } from "sonner";
import { ScanLine, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { buscarItemPorCodigoBarras, type ItemEscaneado } from "../actions";

/**
 * Input para lector de código de barras. El lector "tipea" el código y manda
 * Enter; capturamos el Enter, buscamos el ítem y lo agregamos al pedido. El
 * campo se limpia Y se vuelve a enfocar solo, para escanear uno tras otro sin
 * tener que hacer clic entre medio (pickeo continuo).
 */
export function EscanearCodigo({ onScan }: { onScan: (item: ItemEscaneado) => void }) {
  const [value, setValue] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Mantiene el foco en el input tras cada escaneo (y al montar), incluso si el
  // formulario se re-renderiza al agregar el ítem.
  const refocus = React.useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  async function procesar(codigo: string) {
    const c = codigo.trim();
    setValue("");
    if (!c) {
      refocus();
      return;
    }
    setLoading(true);
    try {
      const item = await buscarItemPorCodigoBarras(c);
      if (item) {
        onScan(item);
        toast.success(`Agregado: ${item.descripcion}`);
      } else {
        toast.error(`Código ${c} no encontrado en productos ni medicamentos.`);
      }
    } catch {
      toast.error("No se pudo buscar el código.");
    } finally {
      setLoading(false);
      refocus();
    }
  }

  return (
    <div className="relative">
      <ScanLine className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      {loading && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
      <Input
        ref={inputRef}
        autoFocus
        className="pl-8"
        placeholder="Escaneá un código de barras (o pegalo y Enter)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            // Evita que el Enter del lector envíe el formulario del pedido.
            e.preventDefault();
            procesar(value);
          }
        }}
      />
    </div>
  );
}
