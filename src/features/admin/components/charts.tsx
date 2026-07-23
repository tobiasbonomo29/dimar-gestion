"use client";

import * as React from "react";
import { formatCurrency } from "@/lib/format";
import type { MesResultado, CategoriaEgreso } from "../queries";

/** Formato compacto para ejes: $1,2 M / $850 k / $320. */
function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (abs >= 1_000) return `$${Math.round(n / 1000)}k`;
  return `$${Math.round(n)}`;
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

const CAT_VARS = [
  "--viz-c1", "--viz-c2", "--viz-c3", "--viz-c4",
  "--viz-c5", "--viz-c6", "--viz-c7", "--viz-c8",
];

// -----------------------------------------------------------------------------
// Barras mensuales: Ventas vs Egresos (2 series agrupadas)
// -----------------------------------------------------------------------------
export function BarrasMensual({ data }: { data: MesResultado[] }) {
  const W = 760;
  const H = 280;
  const padL = 48;
  const padR = 12;
  const padT = 12;
  const padB = 42;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const max = niceMax(Math.max(1, ...data.map((d) => Math.max(d.ventas, d.compras + d.erogaciones))));
  const y = (v: number) => padT + plotH - (v / max) * plotH;
  const groupW = plotW / Math.max(data.length, 1);
  const barW = Math.min(26, (groupW - 8) / 2);
  const ticks = 4;

  return (
    <figure className="m-0">
      <div className="mb-2 flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--viz-ventas)" }} />
          Ventas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--viz-egresos)" }} />
          Egresos
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Ventas y egresos por mes">
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const val = (max / ticks) * i;
          const yy = y(val);
          return (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="var(--viz-grid)" strokeWidth={1} />
              <text x={padL - 6} y={yy + 3} textAnchor="end" fontSize={9} fill="var(--viz-axis)">
                {compact(val)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const gx = padL + groupW * i + groupW / 2;
          const egr = d.compras + d.erogaciones;
          return (
            <g key={d.mes}>
              <rect
                x={gx - barW - 1}
                y={y(d.ventas)}
                width={barW}
                height={padT + plotH - y(d.ventas)}
                rx={3}
                fill="var(--viz-ventas)"
              >
                <title>{`${d.label} — Ventas: ${formatCurrency(d.ventas)}`}</title>
              </rect>
              <rect
                x={gx + 1}
                y={y(egr)}
                width={barW}
                height={padT + plotH - y(egr)}
                rx={3}
                fill="var(--viz-egresos)"
              >
                <title>{`${d.label} — Egresos: ${formatCurrency(egr)}`}</title>
              </rect>
              <text x={gx} y={H - padB + 14} textAnchor="middle" fontSize={9} fill="var(--viz-axis)">
                {d.label}
              </text>
            </g>
          );
        })}
        <line x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} stroke="var(--viz-axis)" strokeWidth={1} />
      </svg>
    </figure>
  );
}

// -----------------------------------------------------------------------------
// Resultado por mes (una barra por mes, verde si positivo / rojo si negativo)
// -----------------------------------------------------------------------------
export function BarrasResultado({ data }: { data: MesResultado[] }) {
  const W = 760;
  const H = 240;
  const padL = 48;
  const padR = 12;
  const padT = 12;
  const padB = 42;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const max = niceMax(Math.max(1, ...data.map((d) => Math.abs(d.resultado))));
  const zeroY = padT + plotH / 2;
  const scale = (plotH / 2) / max;
  const groupW = plotW / Math.max(data.length, 1);
  const barW = Math.min(30, groupW - 10);

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Resultado por mes">
        {[max, max / 2, 0, -max / 2, -max].map((val, i) => {
          const yy = zeroY - val * scale;
          return (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="var(--viz-grid)" strokeWidth={val === 0 ? 1.5 : 1} />
              <text x={padL - 6} y={yy + 3} textAnchor="end" fontSize={9} fill="var(--viz-axis)">
                {compact(val)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const gx = padL + groupW * i + groupW / 2;
          const h = Math.abs(d.resultado) * scale;
          const pos = d.resultado >= 0;
          return (
            <g key={d.mes}>
              <rect
                x={gx - barW / 2}
                y={pos ? zeroY - h : zeroY}
                width={barW}
                height={h}
                rx={3}
                fill={pos ? "var(--viz-pos)" : "var(--viz-neg)"}
              >
                <title>{`${d.label} — Resultado: ${formatCurrency(d.resultado)}`}</title>
              </rect>
              <text x={gx} y={H - padB + 14} textAnchor="middle" fontSize={9} fill="var(--viz-axis)">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

// -----------------------------------------------------------------------------
// Dona de egresos por categoría (top 6 + Otros)
// -----------------------------------------------------------------------------
export function DonutCategorias({ data }: { data: CategoriaEgreso[] }) {
  const top = data.slice(0, 6);
  const restoMonto = data.slice(6).reduce((a, c) => a + c.monto, 0);
  const items = restoMonto > 0 ? [...top, { categoria: "Otros", monto: restoMonto }] : top;
  const total = items.reduce((a, c) => a + c.monto, 0);

  if (total <= 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Sin egresos en el período.</p>;
  }

  const R = 70;
  const r = 44;
  const cx = 90;
  const cy = 90;
  let acc = 0;
  const arcs = items.map((it, i) => {
    const frac = it.monto / total;
    const a0 = acc * 2 * Math.PI - Math.PI / 2;
    acc += frac;
    const a1 = acc * 2 * Math.PI - Math.PI / 2;
    const large = frac > 0.5 ? 1 : 0;
    const p = (ang: number, rad: number) => [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)];
    const [x0, y0] = p(a0, R);
    const [x1, y1] = p(a1, R);
    const [x2, y2] = p(a1, r);
    const [x3, y3] = p(a0, r);
    const d = `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${r} ${r} 0 ${large} 0 ${x3} ${y3} Z`;
    return { d, color: `var(${CAT_VARS[i % CAT_VARS.length]})`, it, frac };
  });

  return (
    <figure className="m-0 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <svg viewBox="0 0 180 180" className="h-44 w-44 shrink-0" role="img" aria-label="Egresos por categoría">
        {arcs.map((a, i) => (
          <path key={i} d={a.d} fill={a.color} stroke="var(--card)" strokeWidth={1.5}>
            <title>{`${a.it.categoria}: ${formatCurrency(a.it.monto)} (${(a.frac * 100).toFixed(0)}%)`}</title>
          </path>
        ))}
      </svg>
      <ul className="grid w-full gap-1.5 text-sm">
        {arcs.map((a, i) => (
          <li key={i} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: a.color }} />
              <span className="truncate">{a.it.categoria}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {formatCurrency(a.it.monto)} · {(a.frac * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
