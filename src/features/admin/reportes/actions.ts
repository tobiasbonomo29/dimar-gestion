"use server";

import type { ActionResult } from "@/features/clientes/actions";
import { getReporteGerencial, type PeriodoReporte, type ReporteGerencial } from "./queries";

export async function generarReporteGerencial(
  periodo: PeriodoReporte,
): Promise<ActionResult<ReporteGerencial>> {
  const { modo, anio, mes } = periodo;
  if (!["general", "anio", "mes"].includes(modo)) return { ok: false, error: "Período inválido" };
  if (modo !== "general" && (!anio || anio < 2000 || anio > 2100)) {
    return { ok: false, error: "Elegí un año válido" };
  }
  if (modo === "mes" && (!mes || mes < 1 || mes > 12)) return { ok: false, error: "Elegí un mes válido" };

  try {
    return { ok: true, data: await getReporteGerencial({ modo, anio, mes }) };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "No se pudo generar el reporte. Probá de nuevo." };
  }
}
