// Declared cases for adding with a name and kit, adding empty, duplicates and administration permission.
import { identityTexts as words } from "../../texts/identities.texts.ts";
import type { Case } from "../promises.ts";
import { programName } from "./kit-catalog.ts";
import type { Program, ToolRegistry } from "../tool-contract.ts";
import { identityTarget } from "./identity-reading.ts";
type NewCase<X extends Program> = Case<X> & {
  input: { identity: string; name?: string; tools: string[]; language: "en" | "es" };
};
const namedCase = <X extends Program>(tools: ToolRegistry<X>): NewCase<X> => ({
  promise: words.promises.createdNamed,
  input: { identity: "luz", name: "Luz", tools: tools.map(tool => tool.id), language: "en" },
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
          language: words.languageNames.en,
          kit: tools.map(tool => `${programName(tool)} · ${words.all}`),
        },
      ],
    },
  },
});
export const newIdentityCases = <X extends Program>(tools: ToolRegistry<X>): readonly [NewCase<X>, ...NewCase<X>[]] => [
  namedCase<X>(tools),
  {
    promise: words.promises.createdBare,
    input: { identity: "sol", tools: [], language: "es" },
    then: {
      says: words.created("sol"),
      facts: [],
      reads: {
        on: identityTarget("sol"),
        lines: [{ identifier: "sol", name: "sol", state: words.count(0), language: words.languageNames.es, kit: [] }],
      },
    },
  },
  {
    promise: words.promises.createAdminOnly,
    by: "beto",
    input: { identity: "luz", tools: [], language: "es" },
    then: { refused: words.only },
  },
  {
    promise: words.promises.duplicateIdentity,
    input: { identity: "beto", tools: [], language: "es" },
    then: { refused: words.repeated },
  },
];
