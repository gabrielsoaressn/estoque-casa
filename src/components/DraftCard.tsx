"use client";

import { AlertTriangle, Check, Pencil, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ItemDraft } from "@/lib/assistant";
import { daysParts, fmtDate, fmtQty, fmtRate } from "@/lib/format";
import { predict } from "@/lib/prediction";
import { CategoryIcon } from "./category";
import { spring } from "./motion";
import { STATUS_META } from "./status";

interface Props {
  draft: ItemDraft;
  now: number;
  onConfirm: () => void;
  onEdit: () => void;
  onDiscard: () => void;
}

/** Cartão de cadastro proposto pela IA: o usuário confere a previsão e confirma, edita ou descarta. */
export function DraftCard({ draft, now, onConfirm, onEdit, onDiscard }: Props) {
  const { input, status } = draft;
  const p = predict({ ...input, id: "", createdAt: now, quantityUpdatedAt: now }, now);
  const parts = daysParts(p.daysLeft, p.currentQuantity);
  const s = STATUS_META[p.status];
  const done = status !== "pending";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: status === "discarded" ? 0.5 : 1, y: 0, scale: 1 }}
      transition={spring}
      className={`relative overflow-hidden rounded-[24px] border bg-surface ${
        status === "added" ? "border-ok/40" : "border-line"
      }`}
    >
      <div className="flex items-center gap-3 p-4 pb-3">
        <CategoryIcon category={input.category} size="sm" />
        <div className="min-w-0 flex-1">
          <p className={`truncate font-semibold ${status === "discarded" ? "line-through" : ""}`}>{input.name}</p>
          <p className="truncate text-sm text-muted">
            {input.category} · {fmtQty(input.quantity, input.unit)}
          </p>
        </div>
        <div className="text-right leading-none">
          <p className={`font-display text-[28px] font-bold tracking-tight tabular-nums ${s.text}`}>{parts.big}</p>
          <p className="mt-1 text-[11px] font-semibold text-muted">{parts.small}</p>
        </div>
      </div>

      <p className="px-4 text-xs text-muted">
        Consome {fmtRate(p.dailyRate, input.unit)}
        {p.depletionDate && (
          <>
            {" "}· acaba <span className="font-semibold text-ink">{fmtDate(p.depletionDate, now)}</span>
          </>
        )}
      </p>

      {draft.duplicateOf && status === "pending" && (
        <p className="mx-4 mt-2 flex items-center gap-1.5 rounded-xl bg-warn/14 px-2.5 py-1.5 text-xs font-semibold text-warn">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Já existe “{draft.duplicateOf}” no estoque
        </p>
      )}

      <AnimatePresence mode="popLayout" initial={false}>
        {done ? (
          <motion.p
            key="done"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-1.5 px-4 pt-3 pb-4 text-sm font-bold ${status === "added" ? "text-ok" : "text-muted"}`}
          >
            {status === "added" ? (
              <>
                <Check className="h-4 w-4" strokeWidth={3} /> Cadastrado no estoque
              </>
            ) : (
              "Descartado"
            )}
          </motion.p>
        ) : (
          <motion.div key="actions" exit={{ opacity: 0, y: -6 }} className="flex gap-2 p-3 pt-3.5">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onConfirm}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-accent py-2.5 text-sm font-bold text-accent-ink"
            >
              <Check className="h-4 w-4" strokeWidth={3} /> Confirmar
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={onEdit}
              aria-label={`Editar ${input.name} antes de cadastrar`}
              className="flex items-center gap-1.5 rounded-full bg-surface-2 px-4 text-sm font-semibold"
            >
              <Pencil className="h-4 w-4" /> Editar
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onDiscard}
              aria-label={`Descartar ${input.name}`}
              className="grid w-10 place-items-center rounded-full bg-surface-2 text-muted"
            >
              <X className="h-4 w-4" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
