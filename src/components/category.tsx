import { Baby, CupSoda, Package, PawPrint, ShowerHead, SprayCan, Wheat, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "Bebê": Baby,
  Despensa: Wheat,
  Limpeza: SprayCan,
  Higiene: ShowerHead,
  Bebidas: CupSoda,
  Pet: PawPrint,
};

export function CategoryIcon({ category, size = "md" }: { category: string; size?: "sm" | "md" }) {
  const Icon = ICONS[category] ?? Package;
  const box = size === "sm" ? "h-10 w-10 rounded-[14px]" : "h-12 w-12 rounded-[16px]";
  return (
    <div className={`${box} grid shrink-0 place-items-center bg-surface-2 text-ink`}>
      <Icon className={size === "sm" ? "h-[18px] w-[18px]" : "h-5 w-5"} strokeWidth={1.75} />
    </div>
  );
}
