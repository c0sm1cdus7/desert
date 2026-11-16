// An origin-specific cause has a case too; its ordinary execution may be closed by a different rule.
import { identityView } from "../../../house/members.ts";
import type { Composition } from "../../../tools/promises.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import { programAlso } from "../../../tools/program-run.ts";
import { cast, given, staged, type Aim } from "../promised-stage.ts";
export async function alsoCauses<X extends Program>(program: Composition<X>, aim: Aim<X>) {
  const causes: string[] = [];
  for (const kase of aim.act.cases) {
    const from = kase.from;
    if (from === undefined) continue;
    await staged(program, async ({ house }) => {
      await given(house(), aim.tool.id, kase.given, kase.at);
      const state = identityView(house().tools.state(), kase.by ?? cast.admin);
      const why = programAlso(aim.act, state, from, house().now());
      if (why !== undefined) causes.push(why);
    });
  }
  return causes;
}
