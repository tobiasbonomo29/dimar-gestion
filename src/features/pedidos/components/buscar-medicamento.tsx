"use client";

import * as React from "react";
import { Pill, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { buscarMedicamentos } from "@/features/medicamentos/actions";

export type MedResultado = {
  nro_registro: string;
  descripcion: string;
  presentacion: string | null;
  precio: number;
};

/** Buscador async de medicamentos del vademécum. Al elegir uno, lo agrega al pedido. */
export function BuscarMedicamento({ onPick }: { onPick: (m: MedResultado) => void }) {
  const [q, setQ] = React.useState("");
  const [resultados, setResultados] = React.useState<MedResultado[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResultados([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await buscarMedicamentos(term);
      setResultados(r);
      setLoading(false);
      setOpen(true);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Pill className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Buscar medicamento del vademécum (Alfabeta)..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q.trim().length >= 2 && setOpen(true)}
        />
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
          {loading ? (
            <p className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
            </p>
          ) : resultados.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">Sin resultados.</p>
          ) : (
            resultados.map((m) => (
              <button
                key={m.nro_registro}
                type="button"
                onClick={() => {
                  onPick(m);
                  setQ("");
                  setResultados([]);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span className="min-w-0">
                  <span className="block truncate">
                    {m.descripcion}
                    {m.presentacion ? <span className="text-muted-foreground"> · {m.presentacion}</span> : null}
                  </span>
                  <span className="block text-xs text-muted-foreground">N° {m.nro_registro}</span>
                </span>
                <span className="shrink-0 tabular-nums font-medium">{formatCurrency(m.precio)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
