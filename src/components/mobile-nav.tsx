"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";

import { SidebarNav } from "@/components/sidebar-nav";

/**
 * Navegación para celular: barra superior fija con el nombre de la empresa y un
 * botón que abre el menú como panel lateral. En pantallas md+ no se muestra
 * (ahí está la barra lateral fija).
 */
export function MobileNav({
  empresaNombre,
  footer,
}: {
  empresaNombre: string;
  /** Contenido del pie del panel (tema y sesión), renderizado en el servidor. */
  footer: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // Cierra el panel al navegar.
  React.useEffect(() => setOpen(false), [pathname]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
        <DialogPrimitive.Trigger
          className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-accent"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </DialogPrimitive.Trigger>
        <Link href="/" className="min-w-0 truncate text-sm font-bold">
          {empresaNombre}
        </Link>
      </header>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-[nav-fade-in_150ms_ease-out] md:hidden" />
        <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r bg-background shadow-lg data-[state=open]:animate-[nav-slide-in_200ms_ease-out] md:hidden">
          <div className="flex h-14 shrink-0 items-center justify-between border-b px-5">
            <DialogPrimitive.Title asChild>
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-bold">{empresaNombre}</span>
                <span className="text-xs text-muted-foreground">Gestión de pedidos</span>
              </div>
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="-mr-2 inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="sr-only">Menú de navegación</DialogPrimitive.Description>
          <div className="flex-1 overflow-y-auto">
            <SidebarNav />
          </div>
          <div className="shrink-0">{footer}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
