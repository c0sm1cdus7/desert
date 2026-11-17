// Define las cartas, sus capacidades, resultados y cálculo conservador de costos.
import { modelTexts } from "../../texts/model.texts.ts";
import type { Capability } from "../../fields/capabilities.ts";

export type Effort = "low" | "medium" | "high";
export type Price = number | null;
export type Prices = { input: Price; output: Price; cacheRead: Price; cacheWrite: Price };
export type BankResult = {
  role: string;
  cases: number;
  scenes: number;
  passed: boolean;
  costUsd: number;
  seconds: number;
  date: string;
  fingerprint: { cases: string; skill: string; frameTexts: string };
};
export type Card = {
  model: string;
  effort: Effort;
  capabilities: readonly Capability[];
  prices: Prices;
  above100k?: Prices;
  results: readonly BankResult[];
};
export type Usage = { input: number; cacheWrite: number; cacheRead: number; output: number };
export type Act = { needs: readonly Capability[] };
/** Lectura de caché y escritura con vida de cinco minutos, por millón de tokens (referencia de la API,
 * 03/11/2026): la escritura cuesta 1,25 veces la entrada; la lectura, 0,1 veces, salvo Sonnet 5.5 y Opus 5.5
 * (0,05) y Fable 5.2 (0,025). */
const price = (input: number, output: number, cacheRead: Price, cacheWrite: Price): Prices => ({
  input,
  output,
  cacheRead,
  cacheWrite,
});
const models = [
  { model: "claude-haiku-5-5", prices: price(0.1, 0.5, 0.01, 0.125), above100k: price(0.5, 2.5, 0.05, 0.625) },
  { model: "claude-sonnet-5-5", prices: price(2, 10, 0.1, 2.5) },
  { model: "claude-opus-5-5", prices: price(4, 20, 0.2, 5) },
  { model: "claude-opus-5", prices: price(5, 25, 0.5, 6.25) },
  { model: "claude-fable-5-2", prices: price(8, 40, 0.2, 10) },
];
export const cards: readonly Card[] = models.flatMap(model =>
  (["low", "medium", "high"] as const).map(effort => ({
    ...model,
    effort,
    capabilities: ["sees"] as const,
    results: [],
  })),
);
const required = (value: unknown, name: string) => {
  if (value === undefined || value === null) throw new Error(`${modelTexts.missing}: ${name}`);
};
export const lostActs = <T extends Act>(card: Card, acts: readonly T[]): T[] => {
  required(card, "card");
  required(acts, "acts");
  return acts.filter(act => {
    required(act.needs, "needs");
    return act.needs.some(need => !card.capabilities.includes(need));
  });
};
export const cardsFor = (acts: readonly Act[]): readonly Card[] => {
  required(acts, "acts");
  return cards.filter(card => lostActs(card, acts).length === 0);
};
const validNumber = (value: number, name: string) => {
  if (!Number.isFinite(value) || value < 0) throw new Error(name);
};
export function costUsd(card: Card, usage: Usage): number {
  required(card, "card");
  required(usage, "usage");
  for (const name of ["input", "cacheWrite", "cacheRead", "output"] as const) {
    const value = usage[name];
    validNumber(value, name);
    if (!Number.isSafeInteger(value)) throw new Error(name);
  }
  const totalInput = usage.input + usage.cacheWrite + usage.cacheRead;
  const prices = card.above100k && totalInput > 100_000 ? card.above100k : card.prices;
  return (["input", "output", "cacheRead", "cacheWrite"] as const).reduce((total, key) => {
    const rate = prices[key];
    if (rate === null && usage[key] > 0) throw new Error(`${modelTexts.unknownPrice}: ${key}`);
    if (rate !== null) validNumber(rate, key);
    return total + (usage[key] * (rate ?? 0)) / 1_000_000;
  }, 0);
}
export function withinCap(args: {
  spentUsd: number;
  capUsd: number;
  card: Card;
  maxInputTokens: number;
  maxOutputTokens: number;
}): boolean {
  required(args, "args");
  const { spentUsd, capUsd, card, maxInputTokens, maxOutputTokens } = args;
  required(card, "card");
  validNumber(spentUsd, "spentUsd");
  validNumber(capUsd, "capUsd");
  const costs = ["input", "cacheWrite", "cacheRead"].map(key =>
    costUsd(card, {
      input: key === "input" ? maxInputTokens : 0,
      cacheWrite: key === "cacheWrite" ? maxInputTokens : 0,
      cacheRead: key === "cacheRead" ? maxInputTokens : 0,
      output: maxOutputTokens,
    }),
  );
  return spentUsd + Math.max(...costs) <= capUsd;
}
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
export function validBankResult(value: unknown): value is BankResult {
  if (!isRecord(value)) return false;
  const result = value;
  const fingerprint = result.fingerprint;
  return (
    typeof result.role === "string" &&
    result.role.length > 0 &&
    typeof result.cases === "number" &&
    Number.isSafeInteger(result.cases) &&
    result.cases > 0 &&
    typeof result.scenes === "number" &&
    Number.isSafeInteger(result.scenes) &&
    result.scenes === result.cases * 3 &&
    typeof result.passed === "boolean" &&
    typeof result.costUsd === "number" &&
    Number.isFinite(result.costUsd) &&
    result.costUsd >= 0 &&
    typeof result.seconds === "number" &&
    Number.isFinite(result.seconds) &&
    result.seconds >= 0 &&
    typeof result.date === "string" &&
    !Number.isNaN(Date.parse(result.date)) &&
    isRecord(fingerprint) &&
    typeof fingerprint.cases === "string" &&
    fingerprint.cases.length > 0 &&
    typeof fingerprint.skill === "string" &&
    fingerprint.skill.length > 0 &&
    typeof fingerprint.frameTexts === "string" &&
    fingerprint.frameTexts.length > 0
  );
}
