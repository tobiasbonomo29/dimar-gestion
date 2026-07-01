"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Búsqueda de clientes: escribe en ?q= con debounce y refresca la lista (server). */
export function ClientesSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = React.useState(searchParams.get("q") ?? "");

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) params.set("q", value.trim());
      else params.delete("q");
      router.replace(`/clientes?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Buscar por razón social, contacto o email..."
        className="pl-8"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}
