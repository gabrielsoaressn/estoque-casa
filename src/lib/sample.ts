import type { Item } from "./types";

type Seed = Omit<Item, "id" | "createdAt" | "quantityUpdatedAt">;

const SEEDS: Seed[] = [
  { name: "Fralda M", category: "Bebê", unit: "un", quantity: 12, consumption: { amount: 6, periodDays: 1 }, restockAmount: 90 },
  { name: "Lenço umedecido", category: "Bebê", unit: "pct", quantity: 2, consumption: { amount: 1, periodDays: 4 }, restockAmount: 4 },
  { name: "Leite integral", category: "Despensa", unit: "L", quantity: 4, consumption: { amount: 1, periodDays: 1 }, restockAmount: 12 },
  { name: "Café", category: "Despensa", unit: "g", quantity: 500, consumption: { amount: 50, periodDays: 1 }, restockAmount: 1000 },
  { name: "Arroz", category: "Despensa", unit: "kg", quantity: 5, consumption: { amount: 1, periodDays: 4 }, restockAmount: 5 },
  { name: "Detergente", category: "Limpeza", unit: "un", quantity: 3, consumption: { amount: 1, periodDays: 7 }, restockAmount: 6 },
  { name: "Sabão em pó", category: "Limpeza", unit: "kg", quantity: 0.8, consumption: { amount: 1, periodDays: 10 }, restockAmount: 2 },
  { name: "Papel higiênico", category: "Higiene", unit: "un", quantity: 16, consumption: { amount: 1, periodDays: 2 }, restockAmount: 24 },
  { name: "Ração", category: "Pet", unit: "kg", quantity: 1.5, consumption: { amount: 0.3, periodDays: 1 }, restockAmount: 10 },
];

export function sampleItems(now: number, newId: () => string): Item[] {
  return SEEDS.map((s) => ({ ...s, id: newId(), createdAt: now, quantityUpdatedAt: now }));
}
