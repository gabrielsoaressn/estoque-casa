"use client";

import { Check, ChevronsRight, PartyPopper, Share2 } from "lucide-react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import { useState, type ReactNode } from "react";
import { daysParts, fmtNum, fmtQty } from "@/lib/format";
import type { PredictedItem } from "@/lib/prediction";
import { CategoryIcon } from "./category";
import { EmptyState } from "./EmptyState";
import { NumberTicker, spring } from "./motion";
import { STATUS_META } from "./status";
import { Stepper } from "./Stepper";

interface Props {
  data: PredictedItem[];
  onRestock: (id: string, amount: number) => void;
  notify: (msg: string) => void;
}

const SWIPE_THRESHOLD = 110;

export function ShoppingList({ data, onRestock, notify }: Props) {
  const list = data.filter((d) => d.prediction.status !== "ok");
  /** Quantidade a comprar editada pelo usuário (senão usa a compra padrão do item). */
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const amountFor = (d: PredictedItem) => amounts[d.item.id] ?? d.item.restockAmount;

  const share = async () => {
    const text =
      "🛒 Lista de Feira\n\n" +
      list.map((d) => `${STATUS_META[d.prediction.status].emoji} ${d.item.name} — ${fmtQty(amountFor(d), d.item.unit)}`).join("\n");
    try {
      if (navigator.share) await navigator.share({ title: "Lista de Feira", text });
      else {
        await navigator.clipboard.writeText(text);
        notify("Lista copiada");
      }
    } catch {
      /* usuário cancelou o compartilhamento */
    }
  };

  const buy = (d: PredictedItem) => {
    const amount = amountFor(d);
    if (!(amount > 0)) return notify("Informe a quantidade comprada");
    onRestock(d.item.id, amount);
    setAmounts((prev) => {
      const next = { ...prev };
      delete next[d.item.id];
      return next;
    });
    notify(`${d.item.name}: +${fmtNum(amount)} ${d.item.unit} no estoque`);
  };

  if (list.length === 0) {
    return (
      <EmptyState
        icon={<PartyPopper className="h-8 w-8" strokeWidth={1.75} />}
        title="Nada para comprar agora"
        text="Quando algum item entrar em Crítico ou Atenção, ele aparece aqui automaticamente."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="flex items-baseline gap-2">
            <NumberTicker value={list.length} className="font-display text-5xl leading-none font-extrabold tracking-tight" />
            <span className="font-semibold">{list.length === 1 ? "item" : "itens"} para repor</span>
          </p>
          <p className="mt-1.5 flex items-center gap-1 text-xs text-muted">
            <ChevronsRight className="h-3.5 w-3.5" /> arraste o card para marcar como comprado
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={share}
          aria-label="Compartilhar lista"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink text-bg"
        >
          <Share2 className="h-5 w-5" />
        </motion.button>
      </div>

      <div className="space-y-2.5">
        <AnimatePresence mode="popLayout" initial={false}>
          {list.map((d) => {
            const { item, prediction: p } = d;
            const s = STATUS_META[p.status];
            const parts = daysParts(p.daysLeft, p.currentQuantity);
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: "70%", scale: 0.9, transition: { duration: 0.3 } }}
                transition={spring}
              >
                <SwipeToBuy onBuy={() => buy(d)}>
                  <div className="flex items-center gap-3">
                    <CategoryIcon category={item.category} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{item.name}</p>
                      <p className="text-sm text-muted">
                        Tem {fmtQty(p.currentQuantity, item.unit)} ·{" "}
                        <span className={`font-semibold ${s.text}`}>{parts.big === "<1" || parts.big === "0" ? parts.small : `${parts.big} ${parts.small}`}</span>
                      </p>
                    </div>
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.bg}`} />
                  </div>
                  <div className="mt-3.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Stepper value={amountFor(d)} onChange={(v) => setAmounts((a) => ({ ...a, [item.id]: v }))} />
                      <span className="text-sm font-medium text-muted">{item.unit}</span>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => buy(d)}
                      className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-accent-ink"
                    >
                      <Check className="h-4 w-4" strokeWidth={3} /> Comprado
                    </motion.button>
                  </div>
                </SwipeToBuy>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Card arrastável: puxe para a direita para revelar o "Comprado" em limão. */
function SwipeToBuy({ children, onBuy }: { children: ReactNode; onBuy: () => void }) {
  const x = useMotionValue(0);
  const reveal = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const iconScale = useTransform(x, [0, SWIPE_THRESHOLD], [0.4, 1.15]);

  return (
    <div className="relative">
      <motion.div
        aria-hidden
        style={{ opacity: reveal }}
        className="absolute inset-0 flex items-center gap-2 rounded-[26px] bg-accent pl-6 font-display text-lg font-bold text-accent-ink"
      >
        <motion.span style={{ scale: iconScale }} className="grid h-9 w-9 place-items-center rounded-full bg-accent-ink text-accent">
          <Check className="h-5 w-5" strokeWidth={3} />
        </motion.span>
        Comprado
      </motion.div>
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.04, right: 0.7 }}
        dragTransition={{ bounceStiffness: 500, bounceDamping: 32 }}
        style={{ x }}
        onDragEnd={(_, info) => {
          if (info.offset.x > SWIPE_THRESHOLD || info.velocity.x > 700) onBuy();
        }}
        className="relative rounded-[26px] border border-line bg-surface p-4"
      >
        {children}
      </motion.div>
    </div>
  );
}
