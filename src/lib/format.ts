import { DAY_MS } from "./prediction";
import { UNITS, type Unit } from "./types";

const num = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export const fmtNum = (n: number) => num.format(n);

export function fmtQty(n: number, unit: Unit): string {
  return unit === "un" || unit === "pct"
    ? `${fmtNum(n)} ${n === 1 ? (unit === "un" ? "unidade" : "pacote") : UNITS.find((u) => u.value === unit)!.label}`
    : `${fmtNum(n)} ${unit}`;
}

export function fmtDaysLeft(daysLeft: number, currentQuantity: number): string {
  if (!Number.isFinite(daysLeft)) return "Sem consumo";
  if (currentQuantity <= 0) return "Esgotado";
  if (daysLeft < 1) return "Acaba hoje";
  const d = Math.floor(daysLeft);
  return d === 1 ? "1 dia" : `${d} dias`;
}

const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
});

export function fmtDate(date: Date, now: number): string {
  const diff = Math.round((startOfDay(date.getTime()) - startOfDay(now)) / DAY_MS);
  if (diff === 0) return "hoje";
  if (diff === 1) return "amanhã";
  if (diff === -1) return "ontem";
  return dateFmt.format(date).replace(/\./g, "");
}

export function fmtRate(dailyRate: number, unit: Unit): string {
  if (dailyRate <= 0) return "sem consumo";
  if (dailyRate >= 1) return `${fmtNum(dailyRate)} ${unit}/dia`;
  return `1 ${unit} a cada ${fmtNum(1 / dailyRate)} dias`;
}

/** Divide a previsão em "número grande" + legenda, para tipografia de destaque. */
export function daysParts(daysLeft: number, currentQuantity: number): { value: number | null; big: string; small: string } {
  if (!Number.isFinite(daysLeft)) return { value: null, big: "∞", small: "sem consumo" };
  if (currentQuantity <= 0) return { value: 0, big: "0", small: "esgotado" };
  if (daysLeft < 1) return { value: null, big: "<1", small: "acaba hoje" };
  const d = Math.floor(daysLeft);
  return { value: d, big: String(d), small: d === 1 ? "dia" : "dias" };
}
