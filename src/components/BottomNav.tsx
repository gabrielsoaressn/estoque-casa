"use client";

import { LayoutGrid, List, Plus, ShoppingBasket, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { spring } from "./motion";

export type Tab = "dashboard" | "products" | "shopping";
export const TAB_ORDER: Tab[] = ["dashboard", "products", "shopping"];

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Painel", icon: LayoutGrid },
  { id: "products", label: "Produtos", icon: List },
  { id: "shopping", label: "Feira", icon: ShoppingBasket },
];

interface Props {
  tab: Tab;
  onTab: (t: Tab) => void;
  onAdd: () => void;
  shoppingCount: number;
}

/** Dock flutuante invertido (tinta sobre papel) com pílula que desliza entre abas. */
export function BottomNav({ tab, onTab, onAdd, shoppingCount }: Props) {
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-2">
        <div className="flex flex-1 items-center gap-1 rounded-[26px] bg-ink p-1.5 shadow-[0_24px_48px_-16px_rgb(0_0_0/0.55)]">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            const badge = id === "shopping" && !active ? shoppingCount : 0;
            return (
              <motion.button
                key={id}
                layout
                transition={spring}
                onClick={() => onTab(id)}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                whileTap={{ scale: 0.94 }}
                className={`relative flex h-12 items-center justify-center gap-2 rounded-[20px] px-4 text-sm font-semibold ${
                  active ? "flex-[1.6] text-accent-ink" : "flex-1 text-bg/55"
                }`}
              >
                {active && (
                  <motion.span layoutId="dock-pill" transition={spring} className="absolute inset-0 rounded-[20px] bg-accent" />
                )}
                <motion.span layout="position" className="relative">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                  <AnimatePresence>
                    {badge > 0 && (
                      <motion.span
                        key={badge}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: "spring", stiffness: 600, damping: 18 }}
                        className="absolute -top-2 -right-2.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-crit px-1 text-[10px] leading-none font-bold text-white ring-2 ring-ink"
                      >
                        {badge}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.span>
                <AnimatePresence initial={false} mode="popLayout">
                  {active && (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0, x: -6, filter: "blur(4px)" }}
                      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, x: -6, filter: "blur(4px)" }}
                      transition={{ duration: 0.2 }}
                      className="relative whitespace-nowrap"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>

        <motion.button
          onClick={onAdd}
          aria-label="Adicionar item"
          whileTap={{ scale: 0.88, rotate: 90 }}
          whileHover={{ rotate: 90 }}
          transition={spring}
          className="grid h-[60px] w-[60px] shrink-0 place-items-center rounded-full bg-accent text-accent-ink shadow-[0_18px_40px_-10px_var(--glow)] ring-4 ring-bg"
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} />
        </motion.button>
      </div>
    </nav>
  );
}
