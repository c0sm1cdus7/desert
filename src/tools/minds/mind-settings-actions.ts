// A mind's own place offers the catalog cards published for it; the administrator assigns one by hand.
import { thing } from "../../fields/fields.ts";
import { object } from "../../fields/visible-text.ts";
import { effect } from "../../house/facts.ts";
import { identityTexts } from "../../texts/identities.texts.ts";
import { mindCardTexts as words } from "../../texts/mind-models.texts.ts";
import { programAct } from "../promises.ts";
import type { Program, State } from "../tool-contract.ts";
import { mindCardCases } from "./mind-settings-cases.ts";
const declaredCards = new WeakSet<object>();
export const isMindCardAction = (act: object) => declaredCards.has(act);
const input = object({ card: thing(words.card, "mind-cards", undefined, undefined, words.none) });
const choiceId = (card: { card: string; version: string }) => JSON.stringify([card.card, card.version]);
export function assignMindCard<X extends Program>(program?: string) {
  const { actor, cards, offered } = cardAccess<X>(program);
  const act = programAct<X, typeof input>({
    ...words.action,
    input,
    on: program ? "tool" : "thing",
    undoable: true,
    refuses: cardRefusals(program),
    offered,
    datum: currentCard(actor),
    choices: (source, state, target) =>
      source === "mind-cards"
        ? cards(state, target).map(card => ({ value: choiceId(card), title: `${card.card} · ${card.version}` }))
        : undefined,
    stops: ({ card }, state, target) =>
      typeof card === "string" && !cards(state, target).some(each => choiceId(each) === card)
        ? words.invalid
        : undefined,
    run: ({ card }, { state, target, by }) => {
      const selected = cards(state, target).find(each => choiceId(each) === card);
      if (!selected) throw new Error("Missing published card");
      return {
        status: "accepted",
        text: words.assigned,
        effects: [
          effect(
            "mind-card-assigned",
            { mind: actor(target), ...selected, capabilities: [...selected.capabilities] },
            by,
          ),
        ],
      };
    },
    cases: mindCardCases<X>(program),
  });
  declaredCards.add(act);
  return act;
}

function cardAccess<X extends Program>(program?: string) {
  const actor = (target: string) => (program ? `mind:${program}` : `assistant:${target.slice("identities/".length)}`);
  const cards = (state: State<X>, target: string) => state.house.mindCards.get(actor(target)) ?? [];
  const offered = (state: State<X>, target: string) => {
    if (state.by !== state.house.admin) return identityTexts.only;
    if (!program && target.startsWith("identities/mind:")) return identityTexts.ownActions;
    if (!program && !state.house.assistants.get(target.slice("identities/".length))?.enabled) return words.absent;
    return cards(state, target).length ? undefined : words.none;
  };
  return { actor, cards, offered };
}

const cardRefusals = (program?: string) => [
  identityTexts.only,
  ...(!program ? [identityTexts.ownActions, words.absent] : []),
  words.none,
  words.invalid,
];

const currentCard =
  <X extends Program>(actor: (target: string) => string) =>
  (state: State<X>, target: string) => {
    const assigned = state.house.mindAssignments.get(actor(target));
    return assigned ? `${assigned.card} · ${assigned.version}` : undefined;
  };
