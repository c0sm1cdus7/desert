// Declared cases to take out, readmit and hand over administration, including the refusal reasons.
import { programName } from "./kit-catalog.ts";
import { identityTexts as words } from "../../texts/identities.texts.ts";
import type { Case } from "../promises.ts";
import type { Program, ToolRegistry } from "../tool-contract.ts";
type EmptyCase<X extends Program> = Case<X> & { input: Readonly<Record<string, never>> };
const removed = { act: "remove", on: "identities/carla", input: {} };
export const removeCases = [
  {
    promise: words.promises.removedRetained,
    on: "identities/carla",
    input: {},
    then: {
      says: words.taken("carla"),
      facts: [],
      sure: words.sureRemove("carla"),
      reads: {
        lines: [
          { identifier: "carla", name: "carla", state: words.removed, language: words.languageNames.en, kit: [] },
        ],
      },
    },
  },
  {
    promise: words.promises.adminRetained,
    on: "identities/ana",
    input: {},
    then: { refused: words.admin },
  },
  {
    promise: words.promises.removedTwice,
    given: [removed],
    on: "identities/carla",
    input: {},
    then: { refused: words.removed },
  },
  {
    promise: words.promises.removeAdminOnly,
    by: "beto",
    on: "identities/carla",
    input: {},
    then: { refused: words.only },
  },
] as const;
export const readmitCases = [
  {
    promise: words.promises.readmittedEmpty,
    given: [removed],
    on: "identities/carla",
    input: {},
    then: {
      says: words.readmitted("carla"),
      facts: [],
      reads: {
        lines: [
          { identifier: "carla", name: "carla", state: words.count(0), language: words.languageNames.en, kit: [] },
        ],
      },
    },
  },
  {
    promise: words.promises.readmitPresent,
    on: "identities/carla",
    input: {},
    then: { refused: words.inside },
  },
  {
    promise: words.promises.readmitAdminOnly,
    given: [removed],
    by: "beto",
    on: "identities/carla",
    input: {},
    then: { refused: words.only },
  },
] as const;
export const handCases = <X extends Program>(registry: ToolRegistry<X>): readonly [EmptyCase<X>, ...EmptyCase<X>[]] => [
  {
    promise: words.promises.administrationHanded,
    on: "identities/carla",
    input: {},
    then: {
      says: words.handed("carla"),
      facts: [],
      sure: words.sureHand("carla"),
      reads: {
        lines: [
          {
            identifier: "carla",
            name: "carla",
            state: words.admin,
            language: words.languageNames.en,
            kit: registry.map(tool => `${programName(tool)} · ${words.all}`),
          },
        ],
      },
    },
  },
  { promise: words.promises.handSelf, on: "identities/ana", input: {}, then: { refused: words.admin } },
  {
    promise: words.promises.handRemoved,
    given: [removed],
    on: "identities/carla",
    input: {},
    then: { refused: words.removed },
  },
  {
    promise: words.promises.handAdminOnly,
    by: "beto",
    on: "identities/carla",
    input: {},
    then: { refused: words.only },
  },
];
