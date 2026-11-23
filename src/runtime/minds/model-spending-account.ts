// Keeps one host's model spending and opening balance in an independently owned durable journal.
import { meant } from "../../fields/phrases.ts";
import { realpathSync } from "node:fs";
import { isAbsolute, relative, sep } from "node:path";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { wholeNumber } from "../../fields/json-values.ts";
import { object } from "../../fields/visible-text.ts";
import { requireMind } from "../../fields/mind-errors.ts";
import { modelAccount, modelCallStep, type ModelCalls } from "../../house/minds/model-call-state.ts";
import { modelCallFacts } from "../../house/minds/model-call-facts.ts";
import { Bus } from "../../journal/bus.ts";
import { vocabulary, type Event } from "../../journal/vocabulary.ts";
import { journalTexts } from "../../texts/journal.texts.ts";
import { SqliteJournal } from "../../storage/journal-store.ts";
import { storageIdentity } from "../../storage/storage-identity.ts";
import { fitsModelCap } from "./mind-call-budget.ts";
import type { MindBilling, MindRuntimeOptions } from "./mind-runtime-options.ts";

export type SpendingAccount = Readonly<{ file: string; openingNanoUsd: number }>;
const openingSchema = object({
  account: Type.String({ minLength: 1 }),
  capNanoUsd: wholeNumber,
  spentNanoUsd: wholeNumber,
});
const capSchema = object({ capNanoUsd: wholeNumber });
const words = vocabulary({ "model-account-opened": openingSchema, "model-account-cap-set": capSchema });
type Opening = Readonly<{ account: string; capNanoUsd: number; spentNanoUsd: number }>;
type State = Readonly<{ opening?: Opening; calls: ModelCalls }>;
const initial: State = { calls: new Map() };
function step(state: State, event: Event): State {
  if (event.layer === "program" && event.kind === "model-account-cap-set") {
    requireMind(state.opening && Value.Check(capSchema, event.data), "billing.cap");
    const next = { ...state, opening: { ...state.opening, capNanoUsd: event.data.capNanoUsd } };
    const current = balance(next);
    requireMind(current.spentNanoUsd + current.reservedNanoUsd <= event.data.capNanoUsd, "billing.cap");
    return next;
  }
  if (event.layer === "program") {
    requireMind(event.kind === "model-account-opened" && !state.opening, "billing.opening");
    requireMind(Value.Check(openingSchema, event.data), "billing.opening");
    requireMind(event.data.spentNanoUsd <= event.data.capNanoUsd, "billing.cap");
    return { ...state, opening: event.data };
  }
  requireMind(state.opening && Object.hasOwn(modelCallFacts, event.kind), "billing.event");
  if (event.kind === "model-call-reserved") {
    requireMind(event.data.account === state.opening.account, "billing.account");
    requireMind(fitsModelCap(balance(state), state.opening.capNanoUsd, event.data.maximumNanoUsd), "billing.cap");
  }
  return { ...state, calls: modelCallStep(state.calls, event) };
}
/** How an account journal reads and folds, for whoever checks one outside a running house. */
export const spendingAccountFold = { words, initial, step };
function balance(state: State) {
  requireMind(state.opening, "billing.opening");
  const current = modelAccount(state.calls, state.opening.account);
  const spentNanoUsd = current.spentNanoUsd + state.opening.spentNanoUsd;
  requireMind(Number.isSafeInteger(spentNanoUsd + current.reservedNanoUsd), "billing.overflow");
  return { ...current, spentNanoUsd };
}
export function openModelSpendingAccount(home: string, config: SpendingAccount, account: string, capNanoUsd: number) {
  const file = accountFile(home, config.file);
  const opening = { account, capNanoUsd, spentNanoUsd: config.openingNanoUsd };
  requireMind(Value.Check(openingSchema, opening) && opening.spentNanoUsd <= capNanoUsd, "billing.opening");
  const journal = openJournal(file);
  let active = true;
  try {
    const state = restoreAccount(journal, opening);
    const bus = new Bus(
      event => journal.append(event, Date.now()),
      write => journal.batch(write),
    );
    const billing: MindBilling = {
      bus,
      calls: () => state().calls,
      balance: name => {
        requireMind(name === account, "billing.account");
        journal.check();
        return balance(state());
      },
      active: () => active,
    };
    return {
      billing,
      close: () => {
        if (!active) return;
        active = false;
        bus.close();
        journal.close();
      },
    };
  } catch (error) {
    journal.close();
    throw error;
  }
}

function restoreAccount(journal: SqliteJournal, opening: Opening) {
  // Replay independently, then verify saved folds against those facts before using their balance.
  const saved = journal.replay(initial, step);
  if (saved.opening) {
    requireMind(
      saved.opening.account === opening.account && saved.opening.spentNanoUsd === opening.spentNanoUsd,
      "billing.opening-mismatch",
    );
    // A signed new cap is recorded once; it never fits below what was already spent or reserved.
    if (saved.opening.capNanoUsd !== opening.capNanoUsd) {
      const current = balance(saved);
      requireMind(current.spentNanoUsd + current.reservedNanoUsd <= opening.capNanoUsd, "billing.cap");
      journal.append(words.fact("model-account-cap-set", { capNanoUsd: opening.capNanoUsd }, "host"), Date.now());
    }
  } else journal.append(words.fact("model-account-opened", opening, "host"), Date.now());
  const state = journal.watch("model-spending", initial, step);
  journal.restore("", true);
  return state;
}
export function fundModelMinds(home: string, options: MindRuntimeOptions, stops: (() => void)[]) {
  if (!options.spendingAccount) return options;
  requireMind(!options.billing, "billing.ambiguous");
  const account = openModelSpendingAccount(home, options.spendingAccount, options.account, options.capNanoUsd);
  stops.push(account.close);
  return { ...options, billing: account.billing };
}

function accountFile(home: string, supplied: string) {
  requireMind(isAbsolute(supplied), "billing.path");
  const file = storageIdentity(supplied);
  const path = relative(realpathSync(home), file);
  requireMind(path.startsWith(`..${sep}`) || isAbsolute(path), "billing.outside-house");
  return file;
}

function openJournal(file: string): SqliteJournal {
  try {
    return new SqliteJournal(file, words);
  } catch (cause) {
    throw new Error(meant(journalTexts.spendingUnavailable), { cause });
  }
}
