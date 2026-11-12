"use client";

import { useCallback, useEffect, useState } from "react";
import { estimateCurrentQuantity } from "./prediction";
import { sampleItems } from "./sample";
import type { Item, ItemInput } from "./types";

const STORAGE_KEY = "estoque-casa:v1";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function useInventory() {
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* dados corrompidos ou storage bloqueado: começa vazio */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage cheio/bloqueado */
    }
  }, [items, loaded]);

  const add = useCallback((input: ItemInput) => {
    const now = Date.now();
    setItems((prev) => [...prev, { ...input, id: newId(), createdAt: now, quantityUpdatedAt: now }]);
  }, []);

  /** Salvar o formulário = nova contagem do estoque (reinicia a base da previsão). */
  const update = useCallback((id: string, input: ItemInput) => {
    const now = Date.now();
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...input, quantityUpdatedAt: now } : it)),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  /** "Comprado": soma a compra ao estoque estimado de agora. */
  const restock = useCallback((id: string, amount: number) => {
    const now = Date.now();
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              quantity: estimateCurrentQuantity(it, now) + amount,
              quantityUpdatedAt: now,
              lastPurchaseAt: now,
            }
          : it,
      ),
    );
  }, []);

  const loadSamples = useCallback(() => setItems(sampleItems(Date.now(), newId)), []);

  return { items, loaded, add, update, remove, restock, loadSamples };
}

/** Relógio que atualiza periodicamente para a previsão "andar" sozinha. */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    const onVisible = () => document.visibilityState === "visible" && setNow(Date.now());
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);
  return now;
}
