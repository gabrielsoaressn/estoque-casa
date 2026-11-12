import type { Item, Prediction, StockStatus } from "./types";

export const DAY_MS = 86_400_000;
export const CRITICAL_DAYS = 3;
export const ATTENTION_DAYS = 7;

export function getDailyRate(item: Pick<Item, "consumption">): number {
  const { amount, periodDays } = item.consumption;
  if (!(amount > 0) || !(periodDays > 0)) return 0;
  return amount / periodDays;
}

/**
 * O estoque não fica parado: entre uma contagem e outra ele vai sendo consumido.
 * Estimamos o saldo atual descontando o consumo do tempo decorrido.
 */
export function estimateCurrentQuantity(item: Item, now: number): number {
  const rate = getDailyRate(item);
  const elapsedDays = Math.max(0, (now - item.quantityUpdatedAt) / DAY_MS);
  return Math.max(0, item.quantity - rate * elapsedDays);
}

export function getStatus(daysLeft: number): StockStatus {
  if (daysLeft < CRITICAL_DAYS) return "critical";
  if (daysLeft <= ATTENTION_DAYS) return "attention";
  return "ok";
}

export function predict(item: Item, now: number = Date.now()): Prediction {
  const dailyRate = getDailyRate(item);

  if (dailyRate === 0) {
    return {
      dailyRate,
      currentQuantity: Math.max(0, item.quantity),
      daysLeft: Infinity,
      depletionDate: null,
      status: item.quantity <= 0 ? "critical" : "ok",
    };
  }

  const currentQuantity = estimateCurrentQuantity(item, now);
  const daysLeft = currentQuantity / dailyRate;
  // Data fixa a partir da última contagem: não "anda" conforme o relógio.
  const depletionDate = new Date(
    item.quantityUpdatedAt + (Math.max(0, item.quantity) / dailyRate) * DAY_MS,
  );

  return { dailyRate, currentQuantity, daysLeft, depletionDate, status: getStatus(daysLeft) };
}

export interface PredictedItem {
  item: Item;
  prediction: Prediction;
}

export function predictAll(items: Item[], now: number): PredictedItem[] {
  return items
    .map((item) => ({ item, prediction: predict(item, now) }))
    .sort((a, b) => a.prediction.daysLeft - b.prediction.daysLeft);
}
