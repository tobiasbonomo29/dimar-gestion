"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { moverPeriodo, periodoActual, periodoLabel } from "../periodo";

/** Selector de mes del módulo. El período viaja en la URL (?periodo=YYYY-MM). */
export function MesSelector({ periodo }: { periodo: string }) {
  const router = useRouter();
  const esActual = periodo === periodoActual();

  function ir(nuevo: string) {
    router.push(`/farmacia?periodo=${nuevo}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        onClick={() => ir(moverPeriodo(periodo, -1))}
        aria-label="Mes anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="min-w-[150px] text-center text-sm font-semibold">{periodoLabel(periodo)}</div>

      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        onClick={() => ir(moverPeriodo(periodo, 1))}
        aria-label="Mes siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Input
        type="month"
        className="h-9 w-[150px]"
        value={periodo}
        onChange={(e) => e.target.value && ir(e.target.value)}
        aria-label="Elegir mes"
      />

      {!esActual && (
        <Button variant="ghost" size="sm" onClick={() => ir(periodoActual())}>
          Mes actual
        </Button>
      )}
    </div>
  );
}
