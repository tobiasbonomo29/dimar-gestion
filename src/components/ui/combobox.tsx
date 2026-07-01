"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ComboboxOption = {
  value: string;
  label: string;
  description?: string;
};

interface Props {
  options: ComboboxOption[];
  value?: string | null;
  onSelect: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Contenido opcional al pie del panel (ej. botón "crear nuevo"). */
  footer?: React.ReactNode;
  className?: string;
  id?: string;
}

/** Combobox con búsqueda: trigger + panel filtrable. Cierra al hacer click afuera. */
export function Combobox({
  options,
  value,
  onSelect,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  emptyText = "Sin resultados.",
  footer,
  className,
  id,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(term) ||
        o.description?.toLowerCase().includes(term),
    );
  }, [options, query]);

  React.useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Button
        id={id}
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between font-normal"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={cn(!selected && "text-muted-foreground", "truncate")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="relative border-b p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 pl-8"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                {emptyText}
              </p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onSelect(o.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <Check
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      o.value === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block truncate">{o.label}</span>
                    {o.description && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {o.description}
                      </span>
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
          {footer && <div className="border-t p-1">{footer}</div>}
        </div>
      )}
    </div>
  );
}
