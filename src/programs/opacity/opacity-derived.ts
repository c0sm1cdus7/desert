// Observe the actual action boundary on real houses; declaration-only coverage cannot prove substitution.
import { ok, deepStrictEqual } from "node:assert/strict";
import { promiseTexts as said } from "../../texts/promises.texts.ts";
import type { Composition, Case } from "../../tools/promises.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { staged, given, perform, type Check, type Aim } from "../promised-stage.ts";
import { declaredSecrets, caseSecrets, valueAt } from "./secret-cases.ts";
const reference = (value: unknown) => typeof value === "string" && /^secret:[0-9a-f-]{36}$/u.test(value);
async function observeCase<X extends Program>(program: Composition<X>, { tool, name, act }: Aim<X>, kase: Case<X>) {
  const positions = caseSecrets(act.input, kase.input);
  if (!positions.length) return [];
  const observations: unknown[] = [];
  const run = Object.assign((value: unknown, context: Parameters<typeof act.run>[1]) => {
    observations.push(structuredClone(value));
    return act.run(value, context);
  }, act.run);
  const registry = program.registry.map(each =>
    each === tool ? { ...each, acts: { ...each.acts, [name]: { ...act, run } } } : each,
  );
  const covered: string[] = [];
  await staged({ ...program, registry }, async ({ house }) => {
    await given(house(), tool.id, kase.given, kase.at);
    observations.length = 0;
    await perform(house(), tool.id, { ...kase, act: name });
    for (const value of observations)
      for (const position of positions) {
        const received = valueAt(value, position.path);
        ok(reference(received) && received !== valueAt(kase.input, position.path), said.nonOpaqueInput(position.slot));
        covered.push(position.slot);
      }
  });
  return covered;
}
export function opacityChecks<X extends Program>(program: Composition<X>): readonly Check[] {
  return program.registry.flatMap(tool =>
    Object.entries(tool.acts).flatMap(([name, act]) => {
      const slots = declaredSecrets(act.input);
      if (!slots.length) return [];
      return [
        {
          name: `${tool.id} · ${name} · ${said.opaqueSecretPositions}`,
          run: async () => {
            const covered = new Set<string>();
            for (const kase of act.cases)
              for (const slot of await observeCase(program, { tool, name, act }, kase)) covered.add(slot);
            deepStrictEqual(
              slots.filter(slot => !covered.has(slot)),
              [],
              said.uncoveredSecretPositions,
            );
          },
        },
      ];
    }),
  );
}
