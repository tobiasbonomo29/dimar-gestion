import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { EMPRESA } from "@/lib/constants";
import { LoginForm } from "@/features/auth/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Si ya hay sesión, va directo al dashboard.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{EMPRESA.nombre}</CardTitle>
          <CardDescription>Gestión de pedidos — ingresá para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
