import Link from "next/link";
import { SidebarNav } from "@/components/sidebar-nav";
import { UserMenu } from "@/components/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";
import { EMPRESA } from "@/lib/constants";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/30 md:flex">
        <div className="flex h-14 items-center border-b px-5">
          <Link href="/" className="flex flex-col leading-tight">
            <span className="text-sm font-bold">{EMPRESA.nombre}</span>
            <span className="text-xs text-muted-foreground">Gestión de pedidos</span>
          </Link>
        </div>
        <div className="flex-1">
          <SidebarNav />
        </div>
        <div className="px-3 pb-1">
          <ThemeToggle />
        </div>
        {user?.email && <UserMenu email={user.email} />}
      </aside>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
