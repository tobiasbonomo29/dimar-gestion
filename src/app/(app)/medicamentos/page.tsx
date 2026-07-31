import {
  getMedicamentos,
  getMedicamentosCount,
  getAlfabetaEstado,
} from "@/features/medicamentos/queries";
import { MedicamentosView } from "@/features/medicamentos/components/medicamentos-view";

export const dynamic = "force-dynamic";

export default async function MedicamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [medicamentos, total, alfabeta] = await Promise.all([
    getMedicamentos(q),
    getMedicamentosCount(),
    getAlfabetaEstado(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Medicamentos</h1>
        <p className="text-sm text-muted-foreground">
          Catálogo y lista de precios (importable desde Alfabeta — MF.Dat).
        </p>
      </div>

      <MedicamentosView medicamentos={medicamentos} total={total} q={q ?? ""} alfabeta={alfabeta} />
    </div>
  );
}
