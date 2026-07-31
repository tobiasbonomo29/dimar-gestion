import {
  getEgresos,
  getEstadoResultados,
  getFacturacion,
  getFacturasImpagas,
  getAportes,
} from "@/features/admin/queries";
import { AdminView } from "@/features/admin/components/admin-view";

export const dynamic = "force-dynamic";

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function AdministracionPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const { desde: qd, hasta: qh } = await searchParams;

  const now = new Date();
  // Por defecto: año en curso (1 de enero → hoy).
  const desde = qd ?? iso(new Date(now.getFullYear(), 0, 1));
  const hasta = qh ?? iso(now);

  const [estado, compras, erogaciones, facturacion, impagas, aportesData] = await Promise.all([
    getEstadoResultados(desde, hasta),
    getEgresos("compra"),
    getEgresos("erogacion"),
    getFacturacion(desde, hasta),
    getFacturasImpagas(),
    getAportes(desde, hasta),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Administración</h1>
        <p className="text-sm text-muted-foreground">
          Compras, erogaciones y estado de resultados de la unidad.
        </p>
      </div>

      <AdminView
        estado={estado}
        compras={compras}
        erogaciones={erogaciones}
        facturacion={facturacion}
        impagas={impagas}
        aportes={aportesData.aportes}
        aportesTotal={aportesData.total}
      />
    </div>
  );
}
