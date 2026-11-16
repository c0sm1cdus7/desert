import { identityTexts as words } from "../../texts/identities.texts.ts";
import type { Case } from "../promises.ts";
import type { Program } from "../tool-contract.ts";
import { identityTarget } from "./identity-reading.ts";
type NewCase<X extends Program> = Case<X> & { input: { identity: string; name?: string; tools: string[] } };
const namedCase = <X extends Program>(tools: string[]): NewCase<X> => ({
  promise: words.promises.createdNamed,
  input: { identity: "luz", name: "Luz", tools },
  then: {
    says: words.created("Luz"),
    facts: [],
    reads: {
      on: identityTarget("luz"),
      lines: [
        {
          identifier: "luz",
          name: "Luz",
          state: words.count(tools.length),
          kit: tools.map(tool => `${tool} · ${words.all}`),
        },
      ],
    },
  },
});
export const newIdentityCases = <X extends Program>(tools: string[]): readonly [NewCase<X>, ...NewCase<X>[]] => [
  namedCase<X>(tools),
  {
    promise: words.promises.createdBare,
    input: { identity: "sol", tools: [] },
    then: {
      says: words.created("sol"),
      facts: [],
      reads: {
        on: identityTarget("sol"),
        lines: [{ identifier: "sol", name: "sol", state: words.count(0), kit: [] }],
      },
    },
  },
  {
    promise: words.promises.createAdminOnly,
    by: "beto",
    input: { identity: "luz", tools: [] },
    then: { refused: words.only },
  },
  {
    promise: words.promises.duplicateIdentity,
    input: { identity: "beto", tools: [] },
    then: { refused: words.repeated },
  },
];
