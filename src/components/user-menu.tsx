"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/features/auth/actions";

export function UserMenu({ email }: { email: string }) {
  return (
    <div className="border-t p-3">
      <p className="truncate px-2 pb-2 text-xs text-muted-foreground" title={email}>
        {email}
      </p>
      <form action={logout}>
        <Button
          type="submit"
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </form>
    </div>
  );
}
