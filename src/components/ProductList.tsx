"use client";

import { PackageOpen, Search, X } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useMemo, useState } from "react";
import { daysParts, fmtQty } from "@/lib/format";
import type { PredictedItem } from "@/lib/prediction";
import { CategoryIcon } from "./category";
import { EmptyState } from "./EmptyState";
import { spring } from "./motion";
import { STATUS_META } from "./status";

export function ProductList({ data, onEdit }: { data: PredictedItem[]; onEdit: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(
    () => [...new Set(data.map((d) => d.item.category))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [data],
  );

  const grouped = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    const filtered = data
      .filter((d) => (!category || d.item.category === category) && (!q || d.item.name.toLocaleLowerCase("pt-BR").includes(q)))
      .sort((a, b) => a.item.name.localeCompare(b.item.name, "pt-BR"));
    const map = new Map<string, PredictedItem[]>();
    for (const d of filtered) map.set(d.item.category, [...(map.get(d.item.category) ?? []), d]);
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  }, [data, query, category]);

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<PackageOpen className="h-8 w-8" strokeWidth={1.75} />}
        title="Nenhum produto ainda"
        text="Toque no botão + para cadastrar o primeiro item."
      />
    );
  }

  const chips: (string | null)[] = [null, ...categories];

  return (
    <div className="space-y-5">
      <label className="flex items-center gap-3 rounded-full border border-line bg-surface px-5 py-3.5 transition focus-within:border-ink">
        <Search className="h-[18px] w-[18px] text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar produto"
          className="w-full bg-transparent text-base outline-none placeholder:text-muted"
        />
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 90 }}
              transition={spring}
              type="button"
              aria-label="Limpar busca"
              onClick={() => setQuery("")}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-bg"
            >
              <X className="h-3.5 w-3.5" strokeWidth={3} />
            </motion.button>
          )}
        </AnimatePresence>
      </label>

      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
        {chips.map((c) => {
          const active = category === c;
          return (
            <button
              key={c ?? "__all"}
              onClick={() => setCategory(c)}
              className={`relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                active ? "text-bg" : "text-muted"
              }`}
            >
              {active && <motion.span layoutId="chip-pill" transition={spring} className="absolute inset-0 rounded-full bg-ink" />}
              <span className="relative">{c ?? "Todos"}</span>
            </button>
          );
        })}
      </div>

      <LayoutGroup>
        <AnimatePresence mode="popLayout">
          {grouped.length === 0 && (
            <motion.p
              key="none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 text-center text-sm text-muted"
            >
              Nenhum produto encontrado.
            </motion.p>
          )}

          {grouped.map(([cat, list]) => (
            <motion.section
              key={cat}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={spring}
            >
              <h2 className="mb-2.5 flex items-center gap-2 px-1 text-xs font-bold tracking-[0.16em] text-muted uppercase">
                {cat}
                <span className="h-px flex-1 bg-line" />
                <span className="tabular-nums">{list.length}</span>
              </h2>
              <div className="overflow-hidden rounded-[26px] border border-line bg-surface">
                <AnimatePresence initial={false}>
                  {list.map(({ item, prediction: p }, i) => {
                    const parts = daysParts(p.daysLeft, p.currentQuantity);
                    return (
                      <motion.button
                        key={item.id}
                        layout="position"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={spring}
                        onClick={() => onEdit(item.id)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-surface-2 ${
                          i > 0 ? "border-t border-line" : ""
                        }`}
                      >
                        <CategoryIcon category={item.category} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{item.name}</p>
                          <p className="text-sm text-muted">{fmtQty(p.currentQuantity, item.unit)}</p>
                        </div>
                        <span
                          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_META[p.status].soft} ${STATUS_META[p.status].text}`}
                        >
                          {parts.big === "∞" ? parts.small : `${parts.big} ${parts.small}`}
                        </span>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.section>
          ))}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  );
}
