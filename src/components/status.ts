import type { StockStatus } from "@/lib/types";

export const STATUS_ORDER: StockStatus[] = ["critical", "attention", "ok"];

export const STATUS_META: Record<
  StockStatus,
  { label: string; emoji: string; hint: string; text: string; bg: string; soft: string }
> = {
  critical: { label: "Crítico", emoji: "🔴", hint: "menos de 3 dias", text: "text-crit", bg: "bg-crit", soft: "bg-crit/12" },
  attention: { label: "Atenção", emoji: "🟡", hint: "3 a 7 dias", text: "text-warn", bg: "bg-warn", soft: "bg-warn/14" },
  ok: { label: "Tranquilo", emoji: "🟢", hint: "mais de 7 dias", text: "text-ok", bg: "bg-ok", soft: "bg-ok/12" },
};
