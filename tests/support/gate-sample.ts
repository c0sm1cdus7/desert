// Every declarative renderer form participates in the distribution's normal derived gate.
import { Type } from "@sinclair/typebox";
import { object } from "../../src/fields/visible-text.ts";
import { programAct, type Case, type ProgramAct, type ProgramTool } from "../../src/tools/promises.ts";
import { gateSampleTexts as words } from "./gate-sample.texts.ts";
import type { Shop } from "./shop.ts";
const empty = object({});
const device = {
  device: {
    id: "sample-device",
    owner: "ana",
    tool: "sample",
    version: "1",
    actions: ["device", "either"],
    result: "sample-result",
  },
};
function destination(at: NonNullable<ProgramAct<Shop>["execution"]>["at"]) {
  const cases: [Case<Shop, typeof empty>, ...Case<Shop, typeof empty>[]] =
    at === "house"
      ? [{ promise: "runs in the house", input: {}, then: { says: words.saved, facts: [] } }]
      : [
          {
            promise: "chooses a live device",
            given: [device],
            input: {},
            destination: { kind: "device", device: "sample-device" },
            then: { says: words.deviceResult, facts: [] },
          },
        ];
  if (at === "either")
    cases.push({
      promise: "chooses the house",
      input: {},
      destination: { kind: "house" },
      then: { says: words.saved, facts: [] },
    });
  return programAct<Shop, typeof empty>({
    ...words[at],
    input: empty,
    execution: at === "house" ? { at } : { at, tool: "sample", version: "1" },
    on: "tool",
    undoable: true,
    run: () => ({ status: "accepted", text: words.saved }),
    cases,
  });
}
const input = object({
  material: Type.String({ secret: true, title: words.secret, placeholder: words.placeholder, maxLength: 100 }),
});
export const gateSample: ProgramTool<Shop> = {
  id: "sample",
  purpose: words.title,
  facts: [],
  acts: {
    house: destination("house"),
    device: destination("device"),
    either: destination("either"),
    private: programAct<Shop, typeof input>({
      ...words.private,
      input,
      on: "tool",
      undoable: true,
      run: () => ({ status: "accepted", text: words.saved }),
      cases: [
        {
          promise: "enters a secret through the router",
          input: { material: "synthetic-material" },
          then: { says: words.saved, facts: [] },
        },
      ],
    }),
    own: programAct<Shop, typeof empty>({
      ...words.own,
      input: empty,
      on: "thing",
      undoable: true,
      run: () => ({ status: "accepted", text: words.saved }),
      cases: [
        { promise: "acts on its own object", on: "sample/object", input: {}, then: { says: words.saved, facts: [] } },
      ],
    }),
    foreign: programAct<Shop, typeof empty>({
      ...words.foreign,
      input: empty,
      on: "tool",
      undoable: true,
      confirms: () => words.sure,
      also: {
        tool: "sales",
        with: (state, target) => (state.tools.sales.has(target.slice("sales/".length)) ? {} : undefined),
      },
      run: () => ({ status: "accepted", text: words.saved }),
      cases: [
        {
          promise: "acts from another tool's object",
          from: "sales/sample",
          given: [{ act: "register", on: "sales", input: { sale: "sample", total: 100 } }],
          input: {},
          then: { says: words.saved, facts: [], sure: words.sure },
        },
      ],
    }),
  },
  targets: () => ["sample/object"],
  view: (_, target) =>
    JSON.stringify(
      target === "sample"
        ? { id: "sample/object", text: words.object, detail: words.detail }
        : { description: words.detail },
    ),
  summary: () => words.detail,
};
export const gateSampleWords = {
  name: words.title,
  key: "m",
  inside: "sales",
  empty: words.empty,
  listed: words.title,
  reads: {},
  presents: [{ title: words.object, empty: words.empty, reads: { description: words.detail } }],
};
