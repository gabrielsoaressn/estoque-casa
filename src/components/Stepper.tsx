"use client";

import { Minus, Plus } from "lucide-react";
import { motion } from "motion/react";

export function Stepper({ value, onChange, step = 1 }: { value: number; onChange: (v: number) => void; step?: number }) {
  const btn = "grid h-9 w-9 place-items-center rounded-full bg-surface text-ink";
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-surface-2 p-1">
      <motion.button whileTap={{ scale: 0.85 }} type="button" aria-label="Diminuir" className={btn} onClick={() => onChange(Math.max(0, +(value - step).toFixed(3)))}>
        <Minus className="h-4 w-4" strokeWidth={2.5} />
      </motion.button>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        aria-label="Quantidade a comprar"
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
        className="w-12 bg-transparent text-center text-base font-bold tabular-nums outline-none"
      />
      <motion.button whileTap={{ scale: 0.85 }} type="button" aria-label="Aumentar" className={btn} onClick={() => onChange(+(value + step).toFixed(3))}>
        <Plus className="h-4 w-4" strokeWidth={2.5} />
      </motion.button>
    </div>
  );
}
