import { Badge } from "@/components/ui/badge";
import { ESTADOS_PEDIDO } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { EstadoPedido } from "@/types/database";

export function EstadoBadge({ estado, className }: { estado: EstadoPedido; className?: string }) {
  const cfg = ESTADOS_PEDIDO[estado];
  return (
    <Badge className={cn(cfg.badge, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </Badge>
  );
}
