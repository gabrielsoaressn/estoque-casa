export type Unit = "un" | "pct" | "L" | "ml" | "kg" | "g";

export const UNITS: { value: Unit; label: string }[] = [
  { value: "un", label: "unidades" },
  { value: "pct", label: "pacotes" },
  { value: "L", label: "litros" },
  { value: "ml", label: "ml" },
  { value: "kg", label: "kg" },
  { value: "g", label: "gramas" },
];

export const CATEGORIES = [
  "Bebê",
  "Despensa",
  "Limpeza",
  "Higiene",
  "Bebidas",
  "Pet",
  "Outros",
] as const;

/** "Consome `amount` (na unidade do item) a cada `periodDays` dias". */
export interface ConsumptionRate {
  amount: number;
  periodDays: number;
}

export interface Item {
  id: string;
  name: string;
  category: string;
  unit: Unit;
  /** Quantidade registrada no momento `quantityUpdatedAt` (contagem ou compra). */
  quantity: number;
  /** Epoch ms da última contagem/compra — base para estimar o estoque atual. */
  quantityUpdatedAt: number;
  consumption: ConsumptionRate;
  /** Quanto costuma comprar de uma vez (padrão do botão "Comprado"). */
  restockAmount: number;
  createdAt: number;
  lastPurchaseAt?: number;
}

export type ItemInput = Pick<
  Item,
  "name" | "category" | "unit" | "quantity" | "consumption" | "restockAmount"
>;

export type StockStatus = "critical" | "attention" | "ok";

export interface Prediction {
  /** Consumo médio por dia, na unidade do item. 0 = sem consumo definido. */
  dailyRate: number;
  /** Estoque estimado agora, descontando o consumo desde a última contagem. */
  currentQuantity: number;
  /** Dias até acabar (Infinity se não há consumo). */
  daysLeft: number;
  /** Data prevista para o item acabar (null se não há consumo). */
  depletionDate: Date | null;
  status: StockStatus;
}
