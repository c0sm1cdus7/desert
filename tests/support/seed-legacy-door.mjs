// Build an upgrade fixture through the pre-migration action engine, preserving its real saved folds.
import { writeFileSync } from "node:fs";
const [root, home] = process.argv.slice(2);
const { startHouse } = await import(`${root}/src/runtime/house-runtime.ts`);
const { shopProgram } = await import(`${root}/tests/support/shop.ts`);
const h = startHouse(home, { ...shopProgram, identities: true, by: "house", creation: { admin: "ana", assignments: [{ identity: "beto", tools: [] }] }, founderDoorKeys: { read: () => new Map([["synthetic-upgrade-founder", { identity: "ana", door: "agente" }]]), present: () => false } });
async function act(act, input, target) {
  h.tools.act({ act: "attend", input: { target } }, 0, "ana");
  const result = h.tools.act({ act, input, target }, h.tools.state().through, "ana");
  const done = result.status === "processing" ? await result.completion : result;
  if (done.status !== "accepted") throw new Error("Legacy fixture action refused");
  return done;
}
try {
  for (const [id, effect] of [["old-block", "frena"], ["old-supervisor", "requiere-supervisor"]])
    await act("save", { id, text: "Legacy threshold", action: { tool: "sales", act: "register" }, condition: { operator: "gt", field: { source: "input", path: "total" }, value: 99999 }, effect }, "rules");
  await act("register", { sale: "OLD-UNDER-LIMIT", total: 1500 }, "sales");
  const invitation = await act("invite", { door: "agente" }, "identities/beto");
  writeFileSync(`${home}/invitation-fixture`, invitation.private.match(/[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}/)[0], { mode: 0o600 });
} finally { h.close(); }
