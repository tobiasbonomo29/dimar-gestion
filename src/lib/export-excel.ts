import * as XLSX from "xlsx";

/** Genera un .xlsx a partir de filas planas y dispara la descarga en el navegador. */
export function exportToExcel(
  rows: Record<string, string | number>[],
  filename: string,
  sheetName = "Datos",
) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}
