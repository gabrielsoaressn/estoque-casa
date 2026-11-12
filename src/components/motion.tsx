"use client";

import { animate, useReducedMotion, type Transition } from "motion/react";
import { useEffect, useRef } from "react";

/** Molas compartilhadas: rápidas e sem "boing" exagerado. */
export const spring: Transition = { type: "spring", stiffness: 420, damping: 34, mass: 0.8 };
export const softSpring: Transition = { type: "spring", stiffness: 240, damping: 28 };
export const easeOutExpo = [0.16, 1, 0.3, 1] as const;

/** Contagem animada estilo 21st "number ticker" — conta a partir do valor anterior. */
export function NumberTicker({ value, className = "" }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const start = from.current;
    from.current = value;
    if (reduce || start === value) {
      el.textContent = String(value);
      return;
    }
    const controls = animate(start, value, {
      duration: 0.9,
      ease: easeOutExpo,
      onUpdate: (v) => (el.textContent = String(Math.round(v))),
    });
    return () => controls.stop();
  }, [value, reduce]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      0
    </span>
  );
}
