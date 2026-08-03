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

/** Genera un .xlsx con varias hojas y dispara la descarga. */
export function exportSheetsToExcel(
  sheets: { name: string; rows: Record<string, string | number>[] }[],
  filename: string,
) {
  const workbook = XLSX.utils.book_new();
  for (const s of sheets) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(s.rows.length ? s.rows : [{}]),
      s.name.slice(0, 31), // Excel limita el nombre de hoja a 31 chars
    );
  }
  XLSX.writeFile(workbook, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}
