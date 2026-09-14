"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Error boundary del grupo (app). Cubre cualquier fallo del render en el
 * servidor —típicamente un hipo transitorio de Supabase (Bad Gateway / Gateway
 * Timeout / "Failed to get API key info")— mostrando un aviso con reintento en
 * lugar de un 500 crudo. reset() vuelve a renderizar la ruta.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [retrying, setRetrying] = React.useState(false);

  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <AlertTriangle className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">No se pudo cargar la información</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Puede ser un problema temporal de conexión con la base de datos.
          Probá de nuevo en unos segundos.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/70">Ref: {error.digest}</p>
        )}
      </div>
      <Button
        onClick={() => {
          setRetrying(true);
          reset();
        }}
        disabled={retrying}
      >
        <RefreshCw className={retrying ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        Reintentar
      </Button>
    </div>
  );
}
