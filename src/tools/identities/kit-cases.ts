// Casos de edición de kit que derivan ejecución, recorridos, permisos y valores actuales.
import type { Case } from "../promises.ts";
import type { Program } from "../tool-contract.ts";
import { identityTexts as words } from "../../texts/identities.texts.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import { kitAct } from "./kit-catalog.ts";
type KitCase<X extends Program> = Case<X> & { input: { value: "yes" | "no" } };
function protectedCases<X extends Program>(on: string): KitCase<X>[] {
  return [
    {
      promise: words.promises.adminKitRetained,
      on: "identities/ana",
      input: { value: "no" },
      then: { refused: words.adminAll },
    },
    {
      promise: words.promises.removedKitRefused,
      on,
      given: [{ act: "remove", on, input: {} }],
      input: { value: "yes" },
      then: { refused: words.removed },
    },
  ];
}
export function kitCases<X extends Program>(
  tool: string,
  act?: string,
  mindOnly = false,
  group?: string,
  saved = words.saved(tool),
): readonly [KitCase<X>, ...KitCase<X>[]] {
  const on = mindOnly ? `identities/mind:${tool}` : "identities/carla";
  const first = {
    act: kitAct(act === undefined && group !== undefined ? `${tool}/${group}` : tool, act),
    on,
    input: { value: "yes" },
  };
  const done = { says: saved, facts: [] };
  const cases: [KitCase<X>, ...KitCase<X>[]] = [
    { promise: words.promises.kitRowGiven, on, input: { value: "yes" }, then: done },
    { promise: words.promises.kitRowTaken, on, given: [first], input: { value: "no" }, then: done },
    {
      promise: words.promises.kitAdminOnly,
      on,
      by: "beto",
      input: { value: "yes" },
      then: { refused: words.only },
    },
    {
      promise: words.promises.kitValueRepeated,
      on,
      given: [first],
      input: { value: "yes" },
      then: { refused: toolTexts.unchanged },
    },
  ];
  if (!mindOnly) cases.push(...protectedCases<X>(on));
  cases.push(...additionalCases<X>(tool, act, on, first, mindOnly, saved));
  return cases;
}

function additionalCases<X extends Program>(
  tool: string,
  act: string | undefined,
  on: string,
  first: { act: string; on: string; input: { value: string } },
  mindOnly: boolean,
  saved: string,
): KitCase<X>[] {
  const cases: KitCase<X>[] = [];
  const done = { says: saved, facts: [] };
  if (act !== undefined)
    cases.push({
      promise: words.promises.inheritedActionTaken,
      on,
      given: [{ act: kitAct(tool), on, input: { value: "yes" } }],
      input: { value: "no" },
      then: { ...done, sure: words.splitFolder },
    });
  if (!mindOnly)
    cases.push(
      { promise: words.promises.mindActionGiven, on: `identities/mind:${tool}`, input: { value: "yes" }, then: done },
      {
        promise: words.promises.mindActionTaken,
        on: `identities/mind:${tool}`,
        given: [{ ...first, on: `identities/mind:${tool}` }],
        input: { value: "no" },
        then: done,
      },
    );
  return cases;
}
