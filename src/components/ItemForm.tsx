"use client";

import { CalendarClock, Trash2, X } from "lucide-react";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { daysParts, fmtDate, fmtRate } from "@/lib/format";
import { estimateCurrentQuantity, predict } from "@/lib/prediction";
import { CATEGORIES, UNITS, type Item, type ItemInput, type Unit } from "@/lib/types";
import { NumberTicker, spring } from "./motion";
import { STATUS_META } from "./status";

interface Props {
  item: Item | null; // null = novo item
  now: number;
  onSave: (input: ItemInput) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const round = (n: number) => Math.round(n * 100) / 100;

export function ItemForm({ item, now, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState(item?.category ?? "Despensa");
  const [unit, setUnit] = useState<Unit>(item?.unit ?? "un");
  const [quantity, setQuantity] = useState(item ? String(round(estimateCurrentQuantity(item, now))) : "");
  const [amount, setAmount] = useState(item ? String(item.consumption.amount) : "1");
  const [periodDays, setPeriodDays] = useState(item ? String(item.consumption.periodDays) : "1");
  const [restock, setRestock] = useState(item ? String(item.restockAmount) : "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const drag = useDragControls();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const input: ItemInput = {
    name: name.trim(),
    category: category.trim() || "Outros",
    unit,
    quantity: Number(quantity) || 0,
    consumption: { amount: Number(amount) || 0, periodDays: Number(periodDays) || 0 },
    restockAmount: Number(restock) || 0,
  };

  const preview = useMemo(
    () => predict({ ...input, id: "", createdAt: now, quantityUpdatedAt: now }, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quantity, amount, periodDays, now],
  );

  const errors = {
    name: !input.name && "Dê um nome ao produto",
    quantity: (quantity === "" || input.quantity < 0) && "Informe a quantidade",
    consumption: !(input.consumption.amount > 0 && input.consumption.periodDays > 0) && "Informe quanto consome",
  };
  const valid = !errors.name && !errors.quantity && !errors.consumption;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSave({ ...input, restockAmount: input.restockAmount || Math.ceil(preview.dailyRate * 15) || 1 });
  };

  const field =
    "w-full rounded-2xl border border-line bg-surface-2/60 px-4 py-3.5 text-base outline-none transition focus-visible:outline-none focus:border-ink focus:bg-surface placeholder:text-muted/70";
  const label = "mb-2 block text-xs font-bold tracking-[0.14em] text-muted uppercase";
  const s = STATUS_META[preview.status];
  const parts = daysParts(preview.daysLeft, preview.currentQuantity);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="form-title">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/45 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <motion.form
        onSubmit={submit}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
        drag="y"
        dragListener={false}
        dragControls={drag}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.8 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120 || info.velocity.y > 600) onClose();
        }}
        className="relative flex max-h-[94dvh] w-full max-w-lg flex-col rounded-t-[34px] bg-bg shadow-2xl sm:rounded-[34px]"
      >
        {/* Alça: arraste para baixo para fechar */}
        <div
          onPointerDown={(e) => drag.start(e)}
          className="flex cursor-grab touch-none justify-center pt-3 pb-1 active:cursor-grabbing"
        >
          <span className="h-1.5 w-11 rounded-full bg-ink/20" />
        </div>

        <div
          onPointerDown={(e) => drag.start(e)}
          className="flex touch-none items-center justify-between px-6 pt-1 pb-3"
        >
          <h2 id="form-title" className="font-display text-3xl font-extrabold tracking-[-0.03em]">
            {item ? "Editar item" : "Novo item"}
          </h2>
          <motion.button
            whileTap={{ scale: 0.9, rotate: 90 }}
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-10 w-10 place-items-center rounded-full bg-surface-2"
          >
            <X className="h-5 w-5" />
          </motion.button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 pt-1 pb-5">
          <div>
            <label className={label} htmlFor="f-name">Produto</label>
            <input id="f-name" className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Fralda M, Leite integral" autoFocus={!item} />
          </div>

          <div>
            <span className={label}>Categoria</span>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set([...CATEGORIES, category])].map((c) => (
                <Pill key={c} active={category === c} group="cat" onClick={() => setCategory(c)}>
                  {c}
                </Pill>
              ))}
            </div>
          </div>

          <div>
            <label className={label} htmlFor="f-qty">{item ? "Quantidade atual (recontagem)" : "Quantidade em estoque"}</label>
            <input id="f-qty" type="number" inputMode="decimal" min={0} step="any" className={`${field} font-display text-2xl font-bold`} value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
            <div className="no-scrollbar mt-2 flex gap-1 overflow-x-auto rounded-full bg-surface-2/70 p-1" role="radiogroup" aria-label="Unidade">
              {UNITS.map((u) => (
                <Pill key={u.value} active={unit === u.value} group="unit" onClick={() => setUnit(u.value)} grow>
                  {u.value}
                </Pill>
              ))}
            </div>
          </div>

          <div>
            <span className={label}>Taxa de consumo</span>
            <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-line bg-surface-2/60 p-2 text-sm font-medium text-muted">
              <span className="pl-2">Usa</span>
              <input aria-label="Quantidade consumida" type="number" inputMode="decimal" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-16 rounded-2xl bg-surface px-2 py-2.5 text-center font-display text-lg font-bold text-ink outline-none focus:ring-2 focus:ring-ink" />
              <span>{unit} a cada</span>
              <input aria-label="Dias" type="number" inputMode="decimal" min={0} step="any" value={periodDays} onChange={(e) => setPeriodDays(e.target.value)} className="w-14 rounded-2xl bg-surface px-2 py-2.5 text-center font-display text-lg font-bold text-ink outline-none focus:ring-2 focus:ring-ink" />
              <span>{Number(periodDays) === 1 ? "dia" : "dias"}</span>
            </div>
            <p className="mt-2 px-1 text-xs text-muted">Ex: “5 un a cada 1 dia” ou “1 L a cada 3 dias”</p>
          </div>

          <div>
            <label className={label} htmlFor="f-restock">
              Costuma comprar quanto? <span className="font-medium tracking-normal normal-case">(opcional)</span>
            </label>
            <input id="f-restock" type="number" inputMode="decimal" min={0} step="any" className={field} value={restock} onChange={(e) => setRestock(e.target.value)} placeholder={`Sugestão: ${Math.ceil(preview.dailyRate * 15) || 1} ${unit} (≈15 dias)`} />
          </div>

          <AnimatePresence initial={false}>
            {!errors.quantity && !errors.consumption && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.96 }}
                animate={{ opacity: 1, height: "auto", scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.96 }}
                transition={spring}
                className="overflow-hidden"
              >
                <div className="rounded-[26px] bg-ink p-5 text-bg">
                  <p className="text-[11px] font-bold tracking-[0.2em] text-bg/50 uppercase">Previsão</p>
                  <div className="mt-2 flex items-end gap-2">
                    {parts.value !== null ? (
                      <NumberTicker value={parts.value} className="font-display text-6xl leading-[0.85] font-extrabold tracking-[-0.05em]" />
                    ) : (
                      <span className="font-display text-6xl leading-[0.85] font-extrabold tracking-[-0.05em]">{parts.big}</span>
                    )}
                    <motion.span key={preview.status} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`mb-0.5 font-display text-xl font-bold ${s.text}`}>
                      {parts.small}
                    </motion.span>
                  </div>
                  <p className="mt-3 flex items-center gap-1.5 text-sm text-bg/60">
                    <CalendarClock className="h-4 w-4" />
                    {preview.depletionDate ? <>Acaba {fmtDate(preview.depletionDate, now)} · {fmtRate(preview.dailyRate, unit)}</> : "Sem consumo definido"}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-2 border-t border-line px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {item && onDelete && (
            <motion.button
              layout
              transition={spring}
              type="button"
              onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
              aria-label={confirmDelete ? "Confirmar exclusão" : "Excluir item"}
              className={`flex items-center justify-center gap-1.5 rounded-full px-4 py-4 font-bold ${
                confirmDelete ? "bg-crit text-white" : "bg-crit/12 text-crit"
              }`}
            >
              <Trash2 className="h-5 w-5" />
              <AnimatePresence>
                {confirmDelete && (
                  <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} className="overflow-hidden whitespace-nowrap">
                    Confirmar
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )}
          <motion.button
            layout
            transition={spring}
            whileTap={valid ? { scale: 0.97 } : undefined}
            type="submit"
            disabled={!valid}
            className={`flex-1 rounded-full py-4 font-bold transition-colors ${
              valid ? "bg-accent text-accent-ink" : "bg-surface-2 text-muted"
            }`}
          >
            {valid ? "Salvar" : errors.name || errors.quantity || errors.consumption}
          </motion.button>
        </div>
      </motion.form>
    </div>
  );
}

function Pill({
  active,
  group,
  onClick,
  grow,
  children,
}: {
  active: boolean;
  group: string;
  onClick: () => void;
  grow?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${grow ? "flex-1" : ""} ${
        active ? "text-bg" : "text-muted"
      } ${!active && !grow ? "bg-surface-2/60" : ""}`}
    >
      {active && <motion.span layoutId={`pill-${group}`} transition={spring} className="absolute inset-0 rounded-full bg-ink" />}
      <span className="relative">{children}</span>
    </button>
  );
}
