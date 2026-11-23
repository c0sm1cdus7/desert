// Explains unavailable program minds using the selected billing account and public scenes.
import { workingLanguage } from "../../fields/languages.ts";
import { phrase } from "../../fields/phrases.ts";
import { costUsd, type Card } from "../../adapters/models/catalog.ts";
import { effect } from "../../house/facts.ts";
import { billingAccount, billingFor } from "./mind-billing.ts";
import { programMindUnavailable } from "../../texts/program-mind.texts.ts";
import { turnNotice, type TurnStop } from "../../texts/mind-turn.texts.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { MindRuntimeHouse, MindRuntimeOptions } from "./mind-runtime-options.ts";
export function maximumProgramCall(card: Card, tokens: number) {
  return Math.max(
    ...(["input", "cacheWrite", "cacheRead"] as const).map(kind =>
      Math.ceil(costUsd(card, { input: 0, cacheWrite: 0, cacheRead: 0, output: 16000, [kind]: tokens }) * 1e9),
    ),
  );
}
export async function programMindAvailability<X extends Program>(
  house: MindRuntimeHouse<X>,
  options: MindRuntimeOptions,
  definitions: MindRuntimeOptions["definitions"] = options.definitions,
) {
  const unavailable = new Map<string, TurnStop>();
  for (const definition of definitions) {
    if (!house.active()) break;
    const reason = await unavailableReason(house, options, definition);
    if (reason && house.active()) {
      unavailable.set(definition.actor, reason);
      const rejection = options.providerRejections?.get(definition.actor);
      const general = programMindUnavailable.text(workingLanguage, {
        actor: definition.actor,
        reason: turnNotice.text(workingLanguage, {
          reason,
          ...(rejection ? { rejection } : {}),
        }),
      });
      house.execution.bus.emit(
        effect(
          "scene",
          { general, to: house.execution.state().house.scenes.get(definition.actor)?.data.to ?? {} },
          definition.actor,
        ),
      );
    }
  }
  return { ...options, unavailable };
}
async function unavailableReason<X extends Program>(
  house: MindRuntimeHouse<X>,
  options: MindRuntimeOptions,
  definition: MindRuntimeOptions["definitions"][number],
): Promise<TurnStop | undefined> {
  const assignment = house.execution.state().house.mindAssignments.get(definition.actor);
  const card = options.catalog.find(card => card.model === assignment?.card && card.effort === assignment.version);
  const candidate = card ?? options.catalog[0];
  let hasKey = false;
  try {
    hasKey = !!candidate && !!(await options.key(candidate));
  } catch {
    hasKey = false;
  }
  if (!house.active()) return "interrupted";
  const account = billingAccount(billingFor(house, options), options.account);
  if (!hasKey) return "no-key";
  if (
    candidate &&
    account.spentNanoUsd + account.reservedNanoUsd + maximumProgramCall(candidate, options.maxInputTokens) >
      options.capNanoUsd
  )
    return "cap";
  return options.unavailable?.get(definition.actor) ?? (!card ? "no-card" : undefined);
}
export function programMindNotices(options: MindRuntimeOptions) {
  return [...(options.unavailable ?? [])].map(([actor, reason]) => {
    const rejection = options.providerRejections?.get(actor);
    return phrase(language =>
      programMindUnavailable.text(language, {
        actor,
        reason: turnNotice.text(language, { reason, ...(rejection ? { rejection } : {}) }),
      }),
    );
  });
}
