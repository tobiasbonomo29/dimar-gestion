"use client";

import * as React from "react";
import { toast } from "sonner";
import { FileDown, FileSpreadsheet, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmpresa } from "@/components/empresa-provider";
import { formatCurrency, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { generarReporteGerencial } from "./actions";
import { descargarReporteExcel } from "./excel";
import { ESTADO_PEDIDO_LABEL, fechaAR, pct, textoVencimiento } from "./format";
import type { ModoReporte, ReporteGerencial } from "./queries";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const $ = formatCurrency;

function Kpi({ label, valor, hint, tono }: { label: string; valor: string; hint?: string; tono?: "neg" | "pos" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p
          className={cn(
            "mt-1 text-xl font-bold tabular-nums",
            tono === "neg" && "text-red-600",
            tono === "pos" && "text-emerald-600",
          )}
        >
          {valor}
        </p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function Fila({ label, valor, sub, neg, bold }: { label: string; valor: string; sub?: boolean; neg?: boolean; bold?: boolean }) {
  return (
    <div className={cn("flex justify-between border-b py-2 text-sm", bold && "border-t-2 border-b-0 border-foreground pt-3 text-base font-bold")}>
      <span className={cn(sub && "pl-4 text-muted-foreground")}>{label}</span>
      <span className={cn("tabular-nums", neg && "text-red-600")}>{valor}</span>
    </div>
  );
}

const num = "text-right tabular-nums";

export function ReportesPanel({ anios }: { anios: number[] }) {
  const empresa = useEmpresa();
  const hoy = new Date();
  const [modo, setModo] = React.useState<ModoReporte>("mes");
  const [anio, setAnio] = React.useState<number>(anios[0] ?? hoy.getFullYear());
  const [mes, setMes] = React.useState<number>(hoy.getMonth() + 1);
  const [reporte, setReporte] = React.useState<ReporteGerencial | null>(null);
  const [cargando, startTransition] = React.useTransition();
  const [pdfLoading, setPdfLoading] = React.useState(false);

  const generar = React.useCallback(() => {
    startTransition(async () => {
      const res = await generarReporteGerencial({ modo, anio, mes });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setReporte(res.data);
    });
  }, [modo, anio, mes]);

  // Genera el del mes en curso al abrir la solapa.
  const inicial = React.useRef(false);
  React.useEffect(() => {
    if (!inicial.current) {
      inicial.current = true;
      generar();
    }
  }, [generar]);

  const archivo = reporte
    ? `reporte-gerencial-${reporte.modo === "general" ? "general" : reporte.desde.slice(0, reporte.modo === "anio" ? 4 : 7)}`
    : "reporte";

  async function descargarPDF() {
    if (!reporte) return;
    setPdfLoading(true);
    try {
      const [{ pdf }, { ReporteGerencialPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./reporte-pdf"),
      ]);
      const blob = await pdf(<ReporteGerencialPDF r={reporte} empresa={empresa} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${archivo}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo generar el PDF.");
    } finally {
      setPdfLoading(false);
    }
  }

  const r = reporte;
  const varios = (r?.meses.length ?? 0) > 1;

  return (
    <div className="space-y-4">
      {/* Selector de período */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="grid gap-1">
            <Label className="text-xs">Período</Label>
            <Select value={modo} onValueChange={(v) => setModo(v as ModoReporte)}>
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes">Por mes</SelectItem>
                <SelectItem value="anio">Por año</SelectItem>
                <SelectItem value="general">General (histórico)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {modo === "mes" && (
            <div className="grid gap-1">
              <Label className="text-xs">Mes</Label>
              <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {modo !== "general" && (
            <div className="grid gap-1">
              <Label className="text-xs">Año</Label>
              <Select value={String(anio)} onValueChange={(v) => setAnio(Number(v))}>
                <SelectTrigger className="h-9 w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anios.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={generar} disabled={cargando}>
            {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Generar reporte
          </Button>

          {r && (
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={descargarPDF} disabled={pdfLoading || cargando}>
                {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                PDF
              </Button>
              <Button variant="outline" onClick={() => descargarReporteExcel(r, archivo)} disabled={cargando}>
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {!r ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          {cargando ? "Generando reporte…" : "Elegí un período y generá el reporte."}
        </div>
      ) : (
        <div className={cn("space-y-4", cargando && "opacity-60")}>
          <div>
            <h2 className="text-lg font-semibold capitalize">{r.label}</h2>
            <p className="text-xs text-muted-foreground">
              {fechaAR(r.desde)} al {fechaAR(r.hasta)} · generado {r.generado}
            </p>
          </div>

          <Tabs defaultValue="eerr" className="space-y-4">
            <TabsList className="flex-wrap">
              <TabsTrigger value="eerr">Estado de resultados</TabsTrigger>
              <TabsTrigger value="vendedores">Ranking vendedores</TabsTrigger>
              <TabsTrigger value="valmax">Ventas a Valmax</TabsTrigger>
              <TabsTrigger value="cobranza">Estado de cobranza</TabsTrigger>
            </TabsList>

            {/* ---------------- Estado de resultados ---------------- */}
            <TabsContent value="eerr" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Estado de resultados</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Importes con IVA incluido (criterio de caja). Ventas = pedidos facturados por fecha de carga.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Fila label="Ventas (con IVA)" valor={$(r.eerr.ventasBrutas)} />
                    <Fila label="IVA ventas" valor={$(r.eerr.ivaVentas)} sub />
                    <Fila label="Ventas netas (sin IVA)" valor={$(r.eerr.ventasNetas)} sub />
                    <Fila label="Cantidad de ventas" valor={String(r.eerr.cantVentas)} sub />
                    <Fila label="Compras" valor={`− ${$(r.eerr.compras)}`} neg />
                    <Fila label="Erogaciones" valor={`− ${$(r.eerr.erogaciones)}`} neg />
                    <Fila label="Total egresos" valor={`− ${$(r.eerr.egresosTotal)}`} neg />
                    <Fila
                      label="RESULTADO"
                      valor={`${$(r.eerr.resultado)} (${pct(r.eerr.margen)})`}
                      neg={r.eerr.resultado < 0}
                      bold
                    />
                    {r.eerr.aportes > 0 && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Aportes de capital del período: {$(r.eerr.aportes)} — no forman parte del resultado.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Egresos por categoría</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Categoría</TableHead>
                          <TableHead className="text-right">Compras</TableHead>
                          <TableHead className="text-right">Erogaciones</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {r.eerr.porCategoria.map((c) => (
                          <TableRow key={c.categoria}>
                            <TableCell>{c.categoria}</TableCell>
                            <TableCell className={num}>{$(c.compras)}</TableCell>
                            <TableCell className={num}>{$(c.erogaciones)}</TableCell>
                            <TableCell className={cn(num, "font-medium")}>{$(c.total)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-semibold">
                          <TableCell>Total</TableCell>
                          <TableCell className={num}>{$(r.eerr.compras)}</TableCell>
                          <TableCell className={num}>{$(r.eerr.erogaciones)}</TableCell>
                          <TableCell className={num}>{$(r.eerr.egresosTotal)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {varios && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Evolución mensual</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mes</TableHead>
                          <TableHead className="text-right">Ventas c/IVA</TableHead>
                          <TableHead className="text-right">Ventas netas</TableHead>
                          <TableHead className="text-right">Compras</TableHead>
                          <TableHead className="text-right">Erogaciones</TableHead>
                          <TableHead className="text-right">Resultado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {r.eerr.mensual.map((m) => (
                          <TableRow key={m.key}>
                            <TableCell className="capitalize">{m.label}</TableCell>
                            <TableCell className={num}>{$(m.ventasBrutas)}</TableCell>
                            <TableCell className={num}>{$(m.ventasNetas)}</TableCell>
                            <TableCell className={num}>{$(m.compras)}</TableCell>
                            <TableCell className={num}>{$(m.erogaciones)}</TableCell>
                            <TableCell className={cn(num, "font-medium", m.resultado < 0 && "text-red-600")}>
                              {$(m.resultado)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-semibold">
                          <TableCell>Total</TableCell>
                          <TableCell className={num}>{$(r.eerr.ventasBrutas)}</TableCell>
                          <TableCell className={num}>{$(r.eerr.ventasNetas)}</TableCell>
                          <TableCell className={num}>{$(r.eerr.compras)}</TableCell>
                          <TableCell className={num}>{$(r.eerr.erogaciones)}</TableCell>
                          <TableCell className={cn(num, r.eerr.resultado < 0 && "text-red-600")}>
                            {$(r.eerr.resultado)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ---------------- Ranking de vendedores ---------------- */}
            <TabsContent value="vendedores" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ranking de ventas por vendedor</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Por venta neta (sin IVA) de pedidos facturados. Comisión según el % de cada vendedor.
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Vendedor</TableHead>
                        <TableHead className="text-right">Pedidos</TableHead>
                        <TableHead className="text-right">Clientes</TableHead>
                        <TableHead className="text-right">Venta neta</TableHead>
                        <TableHead className="text-right">Venta c/IVA</TableHead>
                        <TableHead className="text-right">Partic.</TableHead>
                        <TableHead className="text-right">Ticket prom.</TableHead>
                        <TableHead className="text-right">Comisión</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {r.vendedores.map((v, i) => (
                        <TableRow key={v.vendedor_id ?? "sin"} className={cn(!v.vendedor_id && "text-muted-foreground")}>
                          <TableCell>{v.vendedor_id ? i + 1 : "—"}</TableCell>
                          <TableCell className="font-medium">{v.nombre}</TableCell>
                          <TableCell className={num}>{v.cantPedidos}</TableCell>
                          <TableCell className={num}>{v.cantClientes}</TableCell>
                          <TableCell className={cn(num, "font-medium")}>{$(v.ventasNetas)}</TableCell>
                          <TableCell className={num}>{$(v.ventasBrutas)}</TableCell>
                          <TableCell className={num}>{pct(v.participacion)}</TableCell>
                          <TableCell className={num}>{$(v.ticketPromedio)}</TableCell>
                          <TableCell className={num}>
                            {v.vendedor_id ? `${$(v.comision)} (${v.comision_porcentaje}%)` : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-semibold">
                        <TableCell />
                        <TableCell>Total</TableCell>
                        <TableCell className={num}>{r.eerr.cantVentas}</TableCell>
                        <TableCell />
                        <TableCell className={num}>{$(r.eerr.ventasNetas)}</TableCell>
                        <TableCell className={num}>{$(r.eerr.ventasBrutas)}</TableCell>
                        <TableCell className={num}>100%</TableCell>
                        <TableCell />
                        <TableCell className={num}>{$(r.vendedores.reduce((a, v) => a + v.comision, 0))}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {varios && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Venta neta por mes</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vendedor</TableHead>
                          {r.meses.map((m) => (
                            <TableHead key={m.key} className="text-right capitalize">
                              {m.label}
                            </TableHead>
                          ))}
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {r.vendedores.map((v) => (
                          <TableRow key={v.vendedor_id ?? "sin"}>
                            <TableCell className="font-medium">{v.nombre}</TableCell>
                            {r.meses.map((m) => (
                              <TableCell key={m.key} className={num}>
                                {formatNumber(Math.round(v.porMes[m.key] ?? 0))}
                              </TableCell>
                            ))}
                            <TableCell className={cn(num, "font-medium")}>{formatNumber(Math.round(v.ventasNetas))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ---------------- Ventas a Valmax ---------------- */}
            <TabsContent value="valmax" className="space-y-4">
              {r.valmax.clientes.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No hay un cliente Valmax cargado.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Kpi label="Venta neta (sin IVA)" valor={$(r.valmax.ventasNetas)} hint={`${r.valmax.cantPedidos} pedidos`} />
                    <Kpi label="Venta con IVA" valor={$(r.valmax.ventasBrutas)} />
                    <Kpi label="% de las ventas netas" valor={pct(r.valmax.participacion)} />
                    <Kpi
                      label="Saldo pendiente"
                      valor={$(r.valmax.saldo)}
                      hint={`Cobrado ${$(r.valmax.pagado)}`}
                      tono={r.valmax.saldo > 0.01 ? "neg" : undefined}
                    />
                  </div>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Pedidos de {r.valmax.clientes.join(", ")}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pedido</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Neto</TableHead>
                            <TableHead className="text-right">Total c/IVA</TableHead>
                            <TableHead className="text-right">Cobrado</TableHead>
                            <TableHead className="text-right">Saldo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {r.valmax.pedidos.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                                Sin ventas a Valmax en el período.
                              </TableCell>
                            </TableRow>
                          ) : (
                            <>
                              {r.valmax.pedidos.map((x) => (
                                <TableRow key={x.numero}>
                                  <TableCell>#{x.numero}</TableCell>
                                  <TableCell>{fechaAR(x.fecha)}</TableCell>
                                  <TableCell>{ESTADO_PEDIDO_LABEL[x.estado] ?? x.estado}</TableCell>
                                  <TableCell className={num}>{$(x.neto)}</TableCell>
                                  <TableCell className={num}>{$(x.total)}</TableCell>
                                  <TableCell className={num}>{$(x.pagado)}</TableCell>
                                  <TableCell className={cn(num, x.saldo > 0.01 && "text-red-600")}>{$(x.saldo)}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="font-semibold">
                                <TableCell colSpan={3}>Total</TableCell>
                                <TableCell className={num}>{$(r.valmax.ventasNetas)}</TableCell>
                                <TableCell className={num}>{$(r.valmax.ventasBrutas)}</TableCell>
                                <TableCell className={num}>{$(r.valmax.pagado)}</TableCell>
                                <TableCell className={num}>{$(r.valmax.saldo)}</TableCell>
                              </TableRow>
                            </>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                  {r.valmax.productos.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Productos vendidos a Valmax</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Producto</TableHead>
                              <TableHead className="text-right">Cantidad</TableHead>
                              <TableHead className="text-right">Monto (sin IVA)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {r.valmax.productos.map((x) => (
                              <TableRow key={x.descripcion}>
                                <TableCell>{x.descripcion}</TableCell>
                                <TableCell className={num}>{formatNumber(x.cantidad)}</TableCell>
                                <TableCell className={num}>{$(x.monto)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>

            {/* ---------------- Estado de cobranza ---------------- */}
            <TabsContent value="cobranza" className="space-y-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Kpi label="Facturado en el período" valor={$(r.cobranza.facturadoPeriodo)} />
                <Kpi label="Cobrado en el período" valor={$(r.cobranza.cobradoPeriodo)} hint="Pagos recibidos en el período" />
                <Kpi
                  label="Pendiente de lo facturado"
                  valor={$(r.cobranza.pendienteDelPeriodo)}
                  hint={`Efectividad de cobro ${pct(r.cobranza.efectividad)}`}
                  tono={r.cobranza.pendienteDelPeriodo > 0.01 ? "neg" : "pos"}
                />
                <Kpi
                  label={`Deuda total al ${fechaAR(r.cobranza.fechaCorte)}`}
                  valor={$(r.cobranza.deudaTotal)}
                  hint="Todos los clientes"
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Antigüedad de la deuda</CardTitle>
                    <p className="text-xs text-muted-foreground">Al {fechaAR(r.cobranza.fechaCorte)}</p>
                  </CardHeader>
                  <CardContent>
                    <Fila label="Al día" valor={$(r.cobranza.alDia)} />
                    <Fila label="Por vencer (7 días)" valor={$(r.cobranza.porVencer)} />
                    <Fila label="Vencido 1 a 30 días" valor={$(r.cobranza.vencido1a30)} neg={r.cobranza.vencido1a30 > 0} />
                    <Fila label="Vencido 31 a 60 días" valor={$(r.cobranza.vencido31a60)} neg={r.cobranza.vencido31a60 > 0} />
                    <Fila label="Vencido más de 60 días" valor={$(r.cobranza.vencidoMas60)} neg={r.cobranza.vencidoMas60 > 0} />
                    <Fila label="Deuda total" valor={$(r.cobranza.deudaTotal)} bold />
                    {r.cobranza.saldosAFavor > 0 && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Saldos a favor de clientes: {$(r.cobranza.saldosAFavor)}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Por cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-[420px] overflow-y-auto p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead className="text-right">Facturado período</TableHead>
                          <TableHead className="text-right">Cobrado período</TableHead>
                          <TableHead className="text-right">Saldo actual</TableHead>
                          <TableHead className="text-right">Vencido</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {r.cobranza.porCliente.map((c) => (
                          <TableRow key={c.razon_social}>
                            <TableCell className="font-medium">
                              {c.razon_social}
                              {c.saldoAFavor > 0 && (
                                <span className="ml-1 text-xs text-emerald-600">(a favor {$(c.saldoAFavor)})</span>
                              )}
                            </TableCell>
                            <TableCell className={num}>{$(c.facturadoPeriodo)}</TableCell>
                            <TableCell className={num}>{$(c.cobradoPeriodo)}</TableCell>
                            <TableCell className={cn(num, c.saldoActual > 0.01 && "font-medium")}>{$(c.saldoActual)}</TableCell>
                            <TableCell className={cn(num, c.vencido > 0.01 && "text-red-600")}>{$(c.vencido)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Facturas pendientes de cobro</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Emisión</TableHead>
                        <TableHead>Vencimiento</TableHead>
                        <TableHead>Situación</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {r.cobranza.pendientes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                            No hay facturas pendientes de cobro.
                          </TableCell>
                        </TableRow>
                      ) : (
                        r.cobranza.pendientes.map((f) => (
                          <TableRow key={f.numero}>
                            <TableCell>#{f.numero}</TableCell>
                            <TableCell className="font-medium">{f.razon_social}</TableCell>
                            <TableCell>{fechaAR(f.fecha)}</TableCell>
                            <TableCell>{fechaAR(f.vencimiento)}</TableCell>
                            <TableCell className={cn(f.estado === "vencido" && "text-red-600", f.estado === "por_vencer" && "text-amber-600")}>
                              {textoVencimiento(f.dias)}
                            </TableCell>
                            <TableCell className={num}>{$(f.total)}</TableCell>
                            <TableCell className={cn(num, "font-medium")}>{$(f.saldo)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {varios && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Facturado vs. cobrado por mes</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mes</TableHead>
                          <TableHead className="text-right">Facturado</TableHead>
                          <TableHead className="text-right">Cobrado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {r.cobranza.mensual.map((m) => (
                          <TableRow key={m.key}>
                            <TableCell className="capitalize">{m.label}</TableCell>
                            <TableCell className={num}>{$(m.facturado)}</TableCell>
                            <TableCell className={num}>{$(m.cobrado)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
