"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { easeOutExpo } from "./motion";

/** Estado vazio com ícone flutuando e ondas de "ping" de radar. */
export function EmptyState({ icon, title, text, children }: { icon: ReactNode; title: string; text: string; children?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: easeOutExpo }}
      className="flex flex-col items-center px-6 py-14 text-center"
    >
      <div className="relative mb-8 grid h-28 w-28 place-items-center">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute inset-0 rounded-full border border-ink/15"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1.6, opacity: [0, 0.8, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: i, ease: "easeOut" }}
          />
        ))}
        <motion.div
          animate={{ y: [0, -6, 0], rotate: [-4, 4, -4] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="relative grid h-20 w-20 place-items-center rounded-[26px] bg-accent text-accent-ink shadow-[0_20px_40px_-12px_var(--glow)]"
        >
          {icon}
        </motion.div>
      </div>
      <h3 className="font-display text-2xl font-bold tracking-tight">{title}</h3>
      <p className="mt-2 max-w-xs text-sm text-muted">{text}</p>
      {children && <div className="mt-7 flex flex-col gap-1">{children}</div>}
    </motion.div>
  );
}
