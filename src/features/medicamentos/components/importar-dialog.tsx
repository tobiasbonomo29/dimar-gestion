"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import {
  parsearArchivo,
  parseNumeroAr,
  adivinarMapeo,
  CAMPOS,
  type ArchivoParseado,
  type CampoKey,
} from "../parse";
import { importarMedicamentos, type MedicamentoImportRow } from "../actions";

const CHUNK = 1000;
const vacio = (): Record<CampoKey, number> => ({
  nro_registro: -1, descripcion: -1, precio: -1, droga: -1,
  laboratorio: -1, presentacion: -1, codigo_barras: -1, troquel: -1,
});

export function ImportarDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [fileName, setFileName] = React.useState("");
  const [parsed, setParsed] = React.useState<ArchivoParseado | null>(null);
  const [tieneCabecera, setTieneCabecera] = React.useState(true);
  const [mapeo, setMapeo] = React.useState<Record<CampoKey, number>>(vacio());
  const [importing, setImporting] = React.useState(false);
  const [progreso, setProgreso] = React.useState({ done: 0, total: 0 });

  function reset() {
    setFileName("");
    setParsed(null);
    setMapeo(vacio());
    setProgreso({ done: 0, total: 0 });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const texto = await file.text();
    const p = parsearArchivo(texto);
    setParsed(p);
    // Adivina el mapeo si hay cabecera.
    setMapeo(tieneCabecera && p.filas[0] ? adivinarMapeo(p.filas[0]) : vacio());
  }

  const dataRows = React.useMemo(() => {
    if (!parsed) return [];
    return tieneCabecera ? parsed.filas.slice(1) : parsed.filas;
  }, [parsed, tieneCabecera]);

  const sampleRow = dataRows[0] ?? [];
  const val = (row: string[], idx: number) => (idx >= 0 ? row[idx] ?? "" : "");

  const listo =
    mapeo.nro_registro >= 0 && mapeo.descripcion >= 0 && mapeo.precio >= 0 && dataRows.length > 0;

  function buildRows(): MedicamentoImportRow[] {
    return dataRows.map((row) => ({
      nro_registro: val(row, mapeo.nro_registro),
      descripcion: val(row, mapeo.descripcion),
      precio: parseNumeroAr(val(row, mapeo.precio)),
      droga: val(row, mapeo.droga) || null,
      laboratorio: val(row, mapeo.laboratorio) || null,
      presentacion: val(row, mapeo.presentacion) || null,
      codigo_barras: val(row, mapeo.codigo_barras) || null,
      troquel: val(row, mapeo.troquel) || null,
    }));
  }

  async function onImport() {
    const rows = buildRows();
    setImporting(true);
    setProgreso({ done: 0, total: rows.length });
    let importados = 0;
    try {
      for (let i = 0; i < rows.length; i += CHUNK) {
        const lote = rows.slice(i, i + CHUNK);
        const res = await importarMedicamentos(lote);
        if (!res.ok) {
          toast.error(res.error);
          setImporting(false);
          return;
        }
        importados += res.data.importados;
        setProgreso({ done: Math.min(i + CHUNK, rows.length), total: rows.length });
      }
      toast.success(`${importados} medicamentos importados/actualizados`);
      onOpenChange(false);
      reset();
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Falló la importación.");
    } finally {
      setImporting(false);
    }
  }

  const cols = parsed ? Array.from({ length: parsed.columnas }, (_, i) => i) : [];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!importing) {
          onOpenChange(o);
          if (!o) reset();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] gap-4 overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar lista de medicamentos (MF.Dat)</DialogTitle>
          <DialogDescription>
            Subí el archivo de Alfabeta, indicá qué columna es cada dato y revisá la vista previa.
            Los que ya existen se actualizan por Nº de registro; los nuevos se agregan.
          </DialogDescription>
        </DialogHeader>

        {/* Paso 1: archivo */}
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <label className="cursor-pointer">
              <Upload className="h-4 w-4" />
              Elegir archivo
              <input type="file" accept=".txt,.csv,.dat,text/plain" className="hidden" onChange={onFile} />
            </label>
          </Button>
          <span className="text-sm text-muted-foreground">{fileName || "Ningún archivo elegido"}</span>
        </div>

        {parsed && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 p-3 text-xs">
              <span>
                Delimitador detectado:{" "}
                <b>{parsed.delimitador === "\t" ? "tabulación" : parsed.delimitador}</b> ·{" "}
                {parsed.columnas} columnas · {dataRows.length} filas de datos
              </span>
              <div className="flex items-center gap-2">
                <Switch
                  id="cabecera"
                  checked={tieneCabecera}
                  onCheckedChange={(c) => {
                    setTieneCabecera(c);
                    setMapeo(c && parsed.filas[0] ? adivinarMapeo(parsed.filas[0]) : vacio());
                  }}
                />
                <Label htmlFor="cabecera" className="font-normal">La primera fila es encabezado</Label>
              </div>
            </div>

            {/* Paso 2: mapeo de columnas */}
            <div>
              <p className="mb-2 text-sm font-medium">Asigná cada dato a una columna</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {CAMPOS.map((campo) => (
                  <div key={campo.key} className="flex items-center gap-2">
                    <Label className="w-40 shrink-0 text-xs">{campo.label}</Label>
                    <select
                      className="h-8 flex-1 rounded-md border bg-transparent px-2 text-sm"
                      value={String(mapeo[campo.key])}
                      onChange={(e) =>
                        setMapeo((m) => ({ ...m, [campo.key]: Number(e.target.value) }))
                      }
                    >
                      <option value="-1">— (ninguna)</option>
                      {cols.map((i) => (
                        <option key={i} value={i}>
                          Col {i + 1}
                          {sampleRow[i] ? `: ${sampleRow[i].slice(0, 24)}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Paso 3: vista previa */}
            {listo && (
              <div>
                <p className="mb-2 text-sm font-medium">Vista previa (primeras 6 filas)</p>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº registro</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Droga</TableHead>
                        <TableHead>Laboratorio</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dataRows.slice(0, 6).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{val(row, mapeo.nro_registro)}</TableCell>
                          <TableCell>{val(row, mapeo.descripcion)}</TableCell>
                          <TableCell className="text-muted-foreground">{val(row, mapeo.droga) || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{val(row, mapeo.laboratorio) || "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(parseNumeroAr(val(row, mapeo.precio)))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </>
        )}

        <DialogFooter className="gap-2">
          {importing ? (
            <span className="mr-auto text-sm text-muted-foreground">
              Importando… {progreso.done}/{progreso.total}
            </span>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            Cancelar
          </Button>
          <Button onClick={onImport} disabled={!listo || importing}>
            {importing && <Loader2 className="h-4 w-4 animate-spin" />}
            Importar {dataRows.length > 0 ? `(${dataRows.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
