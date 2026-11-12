"use client";

import { motion } from "motion/react";
import { daysParts, fmtDate, fmtQty, fmtRate } from "@/lib/format";
import type { PredictedItem } from "@/lib/prediction";
import { CategoryIcon } from "./category";
import { softSpring } from "./motion";
import { STATUS_META } from "./status";

/** Barra cheia = 14 dias ou mais de estoque. */
const BAR_SCALE_DAYS = 14;

export function ItemCard({ data, now, onClick }: { data: PredictedItem; now: number; onClick: () => void }) {
  const { item, prediction: p } = data;
  const s = STATUS_META[p.status];
  const parts = daysParts(p.daysLeft, p.currentQuantity);
  const pct = Number.isFinite(p.daysLeft) ? Math.min(100, (p.daysLeft / BAR_SCALE_DAYS) * 100) : 100;

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.975 }}
      transition={softSpring}
      className="w-full rounded-[26px] border border-line bg-surface p-4 text-left"
    >
      <div className="flex items-center gap-3">
        <CategoryIcon category={item.category} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{item.name}</p>
          <p className="truncate text-sm text-muted">
            {fmtQty(p.currentQuantity, item.unit)} · {fmtRate(p.dailyRate, item.unit)}
          </p>
        </div>
        <div className="text-right leading-none">
          <p className={`font-display text-[32px] font-bold tracking-tight tabular-nums ${s.text}`}>{parts.big}</p>
          <p className="mt-1 text-[11px] font-semibold text-muted">{parts.small}</p>
        </div>
      </div>

      <div className="mt-3.5 flex items-center gap-3">
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
          <motion.div
            className={`h-full rounded-full ${s.bg}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(pct, 4)}%` }}
            transition={{ ...softSpring, delay: 0.15 }}
          />
        </div>
        {p.depletionDate && (
          <p className="shrink-0 text-xs text-muted">
            {p.currentQuantity <= 0 ? "acabou " : "acaba "}
            <span className="font-semibold text-ink">{fmtDate(p.depletionDate, now)}</span>
          </p>
        )}
      </div>
    </motion.button>
  );
}
