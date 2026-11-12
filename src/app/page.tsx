"use client";

import { AnimatePresence, MotionConfig, motion, useScroll, useTransform } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BottomNav, TAB_ORDER, type Tab } from "@/components/BottomNav";
import { Dashboard } from "@/components/Dashboard";
import { ItemForm } from "@/components/ItemForm";
import { ProductList } from "@/components/ProductList";
import { ShoppingList } from "@/components/ShoppingList";
import { easeOutExpo, spring } from "@/components/motion";
import { predictAll } from "@/lib/prediction";
import type { ItemInput } from "@/lib/types";
import { useInventory, useNow } from "@/lib/useInventory";

const TITLES: Record<Tab, string> = {
  dashboard: "Visão geral",
  products: "Produtos",
  shopping: "Lista de feira",
};

/** Formulário: fechado (null), novo item ("new") ou editando um id. */
type FormState = null | "new" | { id: string };

const pageVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 48, filter: "blur(8px)" }),
  center: { opacity: 1, x: 0, filter: "blur(0px)" },
  exit: (dir: number) => ({ opacity: 0, x: dir * -48, filter: "blur(8px)" }),
};

export default function Home() {
  const { items, loaded, add, update, remove, restock, loadSamples } = useInventory();
  const now = useNow();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [form, setForm] = useState<FormState>(null);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [dir, setDir] = useState(1);

  const { scrollY } = useScroll();
  const titleScale = useTransform(scrollY, [0, 90], [1, 0.62]);
  const dateOpacity = useTransform(scrollY, [0, 50], [1, 0]);
  const headerShade = useTransform(scrollY, [0, 60], [0, 1]);

  const data = useMemo(() => predictAll(items, now), [items, now]);
  const shoppingCount = data.filter((d) => d.prediction.status !== "ok").length;
  const editing = form && form !== "new" ? items.find((i) => i.id === form.id) ?? null : null;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = useCallback((text: string) => setToast({ id: Date.now(), text }), []);
  const closeForm = useCallback(() => setForm(null), []);
  const openEdit = useCallback((id: string) => setForm({ id }), []);

  const save = (input: ItemInput) => {
    if (editing) {
      update(editing.id, input);
      notify("Item atualizado");
    } else {
      add(input);
      notify("Item cadastrado");
    }
    setForm(null);
  };

  const changeTab = (t: Tab) => {
    if (t === tab) return;
    setDir(TAB_ORDER.indexOf(t) > TAB_ORDER.indexOf(tab) ? 1 : -1);
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(now);

  return (
    <MotionConfig reducedMotion="user">
      {/* Aurora limão respirando atrás do topo */}
      <div aria-hidden className="pointer-events-none fixed -top-48 left-1/2 h-96 w-[40rem] -translate-x-1/2">
        <div className="aurora h-full w-full rounded-full" />
      </div>

      <div className="relative mx-auto min-h-dvh max-w-lg pb-32">
        <header className="sticky top-0 z-30 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3">
          <motion.div
            aria-hidden
            style={{ opacity: headerShade }}
            className="absolute inset-0 border-b border-line bg-bg/80 backdrop-blur-xl"
          />
          <motion.p
            style={{ opacity: dateOpacity }}
            className="relative text-xs font-medium tracking-[0.18em] text-muted uppercase"
          >
            {today}
          </motion.p>
          <motion.div style={{ scale: titleScale, originX: 0, originY: 1 }} className="relative h-12">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.h1
                key={tab}
                initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -18, filter: "blur(6px)" }}
                transition={{ duration: 0.4, ease: easeOutExpo }}
                className="font-display text-[42px] leading-[1.1] font-extrabold tracking-[-0.04em] whitespace-nowrap"
              >
                {TITLES[tab]}
                <span className="text-accent [-webkit-text-stroke:1.5px_var(--ink)]">.</span>
              </motion.h1>
            </AnimatePresence>
          </motion.div>
        </header>

        <main className="relative px-4 pt-3">
          {loaded && (
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.div
                key={tab}
                custom={dir}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.38, ease: easeOutExpo }}
              >
                {tab === "dashboard" ? (
                  <Dashboard data={data} now={now} onEdit={openEdit} onAdd={() => setForm("new")} onLoadSamples={loadSamples} />
                ) : tab === "products" ? (
                  <ProductList data={data} onEdit={openEdit} />
                ) : (
                  <ShoppingList data={data} onRestock={restock} notify={notify} />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        <BottomNav tab={tab} onTab={changeTab} onAdd={() => setForm("new")} shoppingCount={shoppingCount} />

        <AnimatePresence>
          {form && (form === "new" || editing) && (
            <ItemForm
              key={editing?.id ?? "new"}
              item={editing}
              now={now}
              onSave={save}
              onClose={closeForm}
              onDelete={
                editing
                  ? () => {
                      remove(editing.id);
                      setForm(null);
                      notify("Item excluído");
                    }
                  : undefined
              }
            />
          )}
        </AnimatePresence>

        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex justify-center px-4">
          <AnimatePresence mode="popLayout">
            {toast && (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.9, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: 12, scale: 0.95, filter: "blur(6px)" }}
                transition={spring}
                className="flex items-center gap-2.5 rounded-full bg-ink py-3 pr-5 pl-3.5 text-sm font-semibold text-bg shadow-2xl"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                {toast.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  );
}
