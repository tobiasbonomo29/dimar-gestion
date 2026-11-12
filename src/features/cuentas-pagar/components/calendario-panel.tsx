"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, AlertTriangle, CalendarClock, CalendarDays, HandCoins } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { condicionTexto } from "@/lib/condicion-pago";
import { cn } from "@/lib/utils";
import type { FacturaCompraRow } from "../queries";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function hoyIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Celda del calendario: un día con lo que vence ese día. */
type Dia = {
  iso: string;
  numero: number;
  delMes: boolean;
  monto: number;
  facturas: FacturaCompraRow[];
};

/**
 * Grilla del mes empezando en lunes: se completan los días del mes anterior y
 * del siguiente para que las semanas queden cerradas.
 */
export function armarMes(anio: number, mes: number, porDia: Map<string, FacturaCompraRow[]>): Dia[] {
  const primero = new Date(anio, mes, 1);
  // getDay(): 0 = domingo. Se corre para que la semana arranque el lunes.
  const offset = (primero.getDay() + 6) % 7;
  const inicio = new Date(anio, mes, 1 - offset);

  const ultimoDia = new Date(anio, mes + 1, 0).getDate();
  const dias: Dia[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const facturas = porDia.get(iso) ?? [];
    dias.push({
      iso,
      numero: d.getDate(),
      delMes: d.getMonth() === mes,
      monto: facturas.reduce((a, f) => a + f.saldo, 0),
      facturas,
    });
    // Se corta al cerrar la semana que contiene el último día del mes, para no
    // arrastrar una fila entera del mes siguiente.
    const semanaCompleta = (i + 1) % 7 === 0;
    if (semanaCompleta && (d.getMonth() !== mes || d.getDate() === ultimoDia)) break;
  }
  return dias;
}

export function CalendarioPanel({
  facturas,
  onPagar,
}: {
  facturas: FacturaCompraRow[];
  onPagar: (f: FacturaCompraRow) => void;
}) {
  const hoy = hoyIso();
  const [anio, setAnio] = React.useState(() => new Date().getFullYear());
  const [mes, setMes] = React.useState(() => new Date().getMonth());
  const [diaSel, setDiaSel] = React.useState<string | null>(null);

  // Solo lo que falta pagar: lo saldado no ocupa lugar en el calendario.
  const pendientes = React.useMemo(() => facturas.filter((f) => f.saldo > 0.01), [facturas]);

  const porDia = React.useMemo(() => {
    const map = new Map<string, FacturaCompraRow[]>();
    for (const f of pendientes) {
      if (!f.vencimiento) continue;
      const lista = map.get(f.vencimiento) ?? [];
      lista.push(f);
      map.set(f.vencimiento, lista);
    }
    return map;
  }, [pendientes]);

  const dias = React.useMemo(() => armarMes(anio, mes, porDia), [anio, mes, porDia]);

  const vencidas = pendientes.filter((f) => f.estado === "vencido");
  const sinFecha = pendientes.filter((f) => !f.vencimiento);

  // Próximos 30 días (incluye hoy), para el KPI del medio.
  const en30 = pendientes.filter(
    (f) => f.vencimiento && f.vencimiento >= hoy && (f.diasParaVencer ?? 99) <= 30,
  );

  const totalMes = dias.filter((d) => d.delMes).reduce((a, d) => a + d.monto, 0);

  function mover(delta: number) {
    const d = new Date(anio, mes + delta, 1);
    setAnio(d.getFullYear());
    setMes(d.getMonth());
    setDiaSel(null);
  }

  const seleccionadas = diaSel ? porDia.get(diaSel) ?? [] : [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Vencidas</p>
              <p className="text-2xl font-bold tabular-nums text-red-600">
                {formatCurrency(vencidas.reduce((a, f) => a + f.saldo, 0))}
              </p>
              <p className="text-xs text-muted-foreground">
                {vencidas.length} {vencidas.length === 1 ? "factura" : "facturas"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100">
              <CalendarClock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Próximos 30 días</p>
              <p className="text-2xl font-bold tabular-nums text-amber-700">
                {formatCurrency(en30.reduce((a, f) => a + f.saldo, 0))}
              </p>
              <p className="text-xs text-muted-foreground">
                {en30.length} {en30.length === 1 ? "factura" : "facturas"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Vence en {MESES[mes]}
              </p>
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(totalMes)}</p>
              {sinFecha.length > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-500">
                  {sinFecha.length} sin vencimiento cargado
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">
            {MESES[mes]} {anio}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => mover(-1)} aria-label="Mes anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const d = new Date();
                setAnio(d.getFullYear());
                setMes(d.getMonth());
                setDiaSel(null);
              }}
            >
              Hoy
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => mover(1)} aria-label="Mes siguiente">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="pb-1 text-center text-xs font-medium text-muted-foreground">
                {d}
              </div>
            ))}
            {dias.map((d) => {
              const vencido = d.monto > 0 && d.iso < hoy;
              const esHoy = d.iso === hoy;
              return (
                <button
                  key={d.iso}
                  type="button"
                  onClick={() => setDiaSel(d.monto > 0 ? (diaSel === d.iso ? null : d.iso) : null)}
                  disabled={d.monto === 0}
                  className={cn(
                    "min-h-[62px] rounded-md border p-1.5 text-left transition-colors",
                    !d.delMes && "opacity-40",
                    d.monto > 0 ? "cursor-pointer hover:border-foreground/40" : "cursor-default",
                    vencido && "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40",
                    d.monto > 0 && !vencido && "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
                    esHoy && "ring-2 ring-primary ring-offset-1",
                    diaSel === d.iso && "border-foreground",
                  )}
                >
                  <span className={cn("text-xs font-medium", esHoy && "font-bold")}>{d.numero}</span>
                  {d.monto > 0 && (
                    <span
                      className={cn(
                        "mt-0.5 block text-[11px] font-semibold leading-tight tabular-nums",
                        vencido ? "text-red-700 dark:text-red-400" : "text-amber-800 dark:text-amber-400",
                      )}
                    >
                      {formatCurrency(d.monto)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border border-red-200 bg-red-50" /> Vencido
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border border-amber-200 bg-amber-50" /> A vencer
            </span>
            <span>Tocá un día para ver el detalle.</span>
          </p>
        </CardContent>
      </Card>

      {/* Detalle del día elegido, o la agenda de lo que viene. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {diaSel ? `Vencen el ${formatDate(diaSel)}` : "Vencidas y próximas a vencer"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Agenda
            facturas={diaSel ? seleccionadas : [...vencidas, ...en30]}
            onPagar={onPagar}
            vacio={
              diaSel
                ? "No hay nada para ese día."
                : "No tenés facturas vencidas ni por vencer en los próximos 30 días."
            }
          />
        </CardContent>
      </Card>

      {sinFecha.length > 0 && !diaSel && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sin vencimiento cargado</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Agenda facturas={sinFecha} onPagar={onPagar} vacio="" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Agenda({
  facturas,
  onPagar,
  vacio,
}: {
  facturas: FacturaCompraRow[];
  onPagar: (f: FacturaCompraRow) => void;
  vacio: string;
}) {
  const ordenadas = [...facturas].sort((a, b) =>
    (a.vencimiento ?? "9999").localeCompare(b.vencimiento ?? "9999"),
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Vencimiento</TableHead>
          <TableHead>Proveedor</TableHead>
          <TableHead>Condición</TableHead>
          <TableHead className="text-right">Saldo</TableHead>
          <TableHead className="w-[48px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {ordenadas.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
              {vacio}
            </TableCell>
          </TableRow>
        ) : (
          ordenadas.map((f) => (
            <TableRow key={f.id}>
              <TableCell className={cn(f.estado === "vencido" && "font-medium text-red-600")}>
                {f.vencimiento ? formatDate(f.vencimiento) : "—"}
                {f.estado === "vencido" && f.diasParaVencer != null && (
                  <span className="ml-1 text-xs">
                    ({Math.abs(f.diasParaVencer)} {Math.abs(f.diasParaVencer) === 1 ? "día" : "días"})
                  </span>
                )}
              </TableCell>
              <TableCell className="font-medium">
                {f.proveedor}
                {f.numero && <span className="ml-1 text-xs text-muted-foreground">{f.numero}</span>}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {condicionTexto(f.condicion_pago, f.dias_pago)}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right font-medium tabular-nums",
                  f.estado === "vencido" && "text-red-600",
                )}
              >
                {formatCurrency(f.saldo)}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPagar(f)}
                  aria-label="Registrar pago"
                >
                  <HandCoins className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
