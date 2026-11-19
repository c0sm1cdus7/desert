// Synthetic bank publications prepare card selection without a model or a credential.
import { identityTexts } from "../../texts/identities.texts.ts";
import { mindCardTexts as words } from "../../texts/mind-models.texts.ts";
import type { Case, Step } from "../promises.ts";
import type { Program } from "../tool-contract.ts";
type CardCase<X extends Program> = Case<X> & { input: { card: string } };
export function mindCardCases<X extends Program>(program?: string): readonly [CardCase<X>, ...CardCase<X>[]] {
  const on = program ?? "identities/ana";
  const enable: readonly Step[] = program ? [] : [{ act: "enable-assistant", on, input: { name: words.sample } }];
  const bank: Step = {
    mindCards: {
      mind: program ? `mind:${program}` : "assistant:ana",
      cards: [{ card: "example", version: "high", capabilities: [] }],
    },
  };
  const input = { card: JSON.stringify(["example", "high"]) };
  const given = [...enable, bank];
  return [
    { promise: words.assigned, on, given, input, then: { says: words.assigned, facts: [] } },
    { promise: words.none, on, given: enable, input, then: { refused: words.none } },
    { promise: words.invalid, on, given, input: { card: "absent" }, then: { refused: words.invalid } },
    { promise: identityTexts.only, on, given, by: "beto", input, then: { refused: identityTexts.only } },
    ...(!program ? [{ promise: words.absent, on, input, then: { refused: words.absent } }] : []),
  ];
}
