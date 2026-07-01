"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      className={className ?? "w-full justify-start text-muted-foreground hover:text-foreground"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Cambiar tema"
    >
      {/* Evita mismatch de hidratación: hasta montar, muestra un ícono neutro. */}
      {mounted ? (
        isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      {mounted ? (isDark ? "Modo claro" : "Modo oscuro") : "Tema"}
    </Button>
  );
}
