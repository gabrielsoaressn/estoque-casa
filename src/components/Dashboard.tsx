"use client";

import { ArrowUpRight, PackageOpen, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { daysParts, fmtDate } from "@/lib/format";
import type { PredictedItem } from "@/lib/prediction";
import type { StockStatus } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { ItemCard } from "./ItemCard";
import { easeOutExpo, NumberTicker, softSpring } from "./motion";
import { STATUS_META, STATUS_ORDER } from "./status";

interface Props {
  data: PredictedItem[];
  now: number;
  onEdit: (id: string) => void;
  onAdd: () => void;
  onLoadSamples: () => void;
}

const list = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.12 } } };
const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOutExpo } },
};

export function Dashboard({ data, now, onEdit, onAdd, onLoadSamples }: Props) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={<PackageOpen className="h-8 w-8" strokeWidth={1.75} />}
        title="Seu estoque está vazio"
        text="Cadastre os itens que vocês usam todo dia e o app avisa quando cada um vai acabar."
      >
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onAdd}
          className="rounded-full bg-ink px-6 py-3.5 font-semibold text-bg"
        >
          Cadastrar primeiro item
        </motion.button>
        <button onClick={onLoadSamples} className="flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-muted">
          <Sparkles className="h-4 w-4" /> Ver com itens de exemplo
        </button>
      </EmptyState>
    );
  }

  const groups = Object.fromEntries(
    STATUS_ORDER.map((st) => [st, data.filter((d) => d.prediction.status === st)]),
  ) as Record<StockStatus, PredictedItem[]>;

  return (
    <div className="space-y-7">
      <RadarHero next={data[0]} now={now} onOpen={() => onEdit(data[0].item.id)} />

      {/* Espectro: proporção do estoque em cada faixa */}
      <div>
        <div className="flex h-3 gap-1 overflow-hidden rounded-full">
          {STATUS_ORDER.map((st) =>
            groups[st].length === 0 ? null : (
              <motion.div
                key={st}
                layout
                initial={{ flexGrow: 0 }}
                animate={{ flexGrow: groups[st].length }}
                transition={softSpring}
                className={`h-full min-w-3 rounded-full ${STATUS_META[st].bg}`}
              />
            ),
          )}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {STATUS_ORDER.map((st) => {
            const m = STATUS_META[st];
            return (
              <a key={st} href={`#sec-${st}`} className="group rounded-2xl px-1 py-1">
                <p className="flex items-baseline gap-1.5">
                  <NumberTicker value={groups[st].length} className={`font-display text-4xl font-bold tracking-tight ${m.text}`} />
                  <span className="text-sm font-semibold">{m.label}</span>
                </p>
                <p className="text-xs text-muted">{m.hint}</p>
              </a>
            );
          })}
        </div>
      </div>

      {STATUS_ORDER.map((st) =>
        groups[st].length === 0 ? null : (
          <section key={st} id={`sec-${st}`} className="scroll-mt-28">
            <h2 className="mb-3 flex items-center gap-2 px-1 text-xs font-bold tracking-[0.16em] text-muted uppercase">
              <span className={`h-2 w-2 rounded-full ${STATUS_META[st].bg}`} />
              {STATUS_META[st].label}
              <span className="h-px flex-1 bg-line" />
              <span className="tabular-nums">{groups[st].length}</span>
            </h2>
            <motion.div variants={list} initial="hidden" animate="show" className="space-y-2.5">
              {groups[st].map((d) => (
                <motion.div key={d.item.id} variants={rise} layout>
                  <ItemCard data={d} now={now} onClick={() => onEdit(d.item.id)} />
                </motion.div>
              ))}
            </motion.div>
          </section>
        ),
      )}
    </div>
  );
}

/** Cartão-herói: o item que acaba primeiro, com varredura de radar girando ao fundo. */
function RadarHero({ next, now, onOpen }: { next: PredictedItem; now: number; onOpen: () => void }) {
  const { item, prediction: p } = next;
  const parts = daysParts(p.daysLeft, p.currentQuantity);
  const m = STATUS_META[p.status];

  return (
    <motion.button
      onClick={onOpen}
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.6, ease: easeOutExpo }}
      className="relative block w-full overflow-hidden rounded-[32px] bg-ink p-6 text-left text-bg"
    >
      {/* Radar */}
      <div aria-hidden className="absolute -top-16 -right-16 h-64 w-64">
        {[1, 0.72, 0.44].map((s) => (
          <div key={s} className="absolute inset-0 rounded-full border border-bg/10" style={{ transform: `scale(${s})` }} />
        ))}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: "conic-gradient(from 0deg, transparent 0deg, var(--accent) 50deg, transparent 52deg)", opacity: 0.35 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 5, ease: "linear", repeat: Infinity }}
        />
        <motion.span
          className={`absolute top-[38%] left-[30%] h-2.5 w-2.5 rounded-full ${m.bg}`}
          animate={{ scale: [1, 2.2, 1], opacity: [1, 0.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <p className="relative flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-bg/50 uppercase">
        Próxima reposição
      </p>

      <div className="relative mt-3 flex items-end gap-2">
        {parts.value !== null ? (
          <NumberTicker value={parts.value} className="font-display text-[104px] leading-[0.8] font-extrabold tracking-[-0.06em]" />
        ) : (
          <span className="font-display text-[104px] leading-[0.8] font-extrabold tracking-[-0.06em]">{parts.big}</span>
        )}
        <span className={`mb-1 font-display text-2xl font-bold ${m.text}`}>{parts.small}</span>
      </div>

      <div className="relative mt-5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-bold tracking-tight">{item.name}</p>
          <p className="text-sm text-bg/55">
            {p.depletionDate ? `${p.currentQuantity <= 0 ? "Acabou" : "Acaba"} ${fmtDate(p.depletionDate, now)}` : "Sem consumo definido"}
          </p>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">
          <ArrowUpRight className="h-5 w-5" strokeWidth={2.5} />
        </span>
      </div>
    </motion.button>
  );
}
