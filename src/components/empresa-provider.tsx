"use client";

import * as React from "react";
import type { Empresa } from "@/features/unidades/queries";

const EmpresaContext = React.createContext<Empresa | null>(null);

/** Provee el membrete de la unidad actual a los componentes cliente (PDF, etc.). */
export function EmpresaProvider({
  empresa,
  children,
}: {
  empresa: Empresa;
  children: React.ReactNode;
}) {
  return <EmpresaContext.Provider value={empresa}>{children}</EmpresaContext.Provider>;
}

export function useEmpresa(): Empresa {
  const ctx = React.useContext(EmpresaContext);
  if (!ctx) {
    throw new Error("useEmpresa debe usarse dentro de <EmpresaProvider>.");
  }
  return ctx;
}
