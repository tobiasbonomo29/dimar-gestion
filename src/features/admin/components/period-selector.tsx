"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function presetRange(preset: "mes" | "anio" | "12m"): { desde: string; hasta: string } {
  const now = new Date();
  const hasta = iso(now);
  if (preset === "mes") return { desde: iso(new Date(now.getFullYear(), now.getMonth(), 1)), hasta };
  if (preset === "anio") return { desde: iso(new Date(now.getFullYear(), 0, 1)), hasta };
  const d = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  return { desde: iso(d), hasta };
}

export function PeriodSelector({ desde, hasta }: { desde: string; hasta: string }) {
  const router = useRouter();
  const [d, setD] = React.useState(desde);
  const [h, setH] = React.useState(hasta);

  React.useEffect(() => {
    setD(desde);
    setH(hasta);
  }, [desde, hasta]);

  function aplicar(nd: string, nh: string) {
    router.push(`/administracion?desde=${nd}&hasta=${nh}`);
  }

  const presets: { key: "mes" | "anio" | "12m"; label: string }[] = [
    { key: "mes", label: "Este mes" },
    { key: "anio", label: "Este año" },
    { key: "12m", label: "Últimos 12 meses" },
  ];

  function isActive(preset: "mes" | "anio" | "12m") {
    const r = presetRange(preset);
    return r.desde === desde && r.hasta === hasta;
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <Button
            key={p.key}
            variant={isActive(p.key) ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const r = presetRange(p.key);
              aplicar(r.desde, r.hasta);
            }}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <div className="grid gap-1">
          <Label htmlFor="desde" className="text-xs">Desde</Label>
          <Input id="desde" type="date" className="h-8 w-[150px]" value={d} onChange={(e) => setD(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="hasta" className="text-xs">Hasta</Label>
          <Input id="hasta" type="date" className="h-8 w-[150px]" value={h} onChange={(e) => setH(e.target.value)} />
        </div>
        <Button size="sm" variant="secondary" onClick={() => aplicar(d, h)} disabled={!d || !h}>
          Aplicar
        </Button>
      </div>
    </div>
  );
}
