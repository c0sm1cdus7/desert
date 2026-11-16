// A kept journal of a program with Identidades opens in inspection as a live house opens it: with the core piece in
// its registry and the guard on every new identity name.
import { afterEach, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MemoryHouseKeys } from "./house-keys.ts";
import { identityNameProblem } from "../../house/identities/identity-name.ts";
import { effect } from "../../house/facts.ts";
import { shopProgram } from "../../../tests/support/shop.ts";
import { startHouse } from "../../runtime/house-runtime.ts";
import { inspectKept } from "../../checks/kept/kept-inspection.ts";

const homes: string[] = [];
afterEach(() => homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true })));
function kept(identities: boolean) {
  const home = mkdtempSync(join(tmpdir(), "kept-identities-"));
  homes.push(home);
  const program = { ...shopProgram, identities };
  const creation = { admin: "ana", assignments: [{ identity: "ana", tools: ["sales", "payments"] }] };
  startHouse(home, { ...program, by: "house", creation, secretKeys: new MemoryHouseKeys() }).close();
  return { program, file: join(home, "journal.sqlite") };
}
it("inspection composes Identidades when the program asks for it, as the live house does", async () => {
  for (const identities of [true, false]) {
    const { program, file } = kept(identities);
    const ids = await inspectKept(program, file, house => house.registry.map(tool => tool.id));
    expect(ids.includes("identities")).toBe(identities);
  }
});
it("inspection keeps the guard on new identity names: a grant for a mind is refused before it is written", async () => {
  const { program, file } = kept(true);
  const written = await inspectKept(program, file, house => {
    const before = house.tools.state().through;
    const grant = () => house.bus.emit(effect("granted", { identity: "mind:payments", tools: ["payments"] }, "ana"));
    expect(grant).toThrow(identityNameProblem("mind:payments", "house"));
    return house.tools.state().through - before;
  });
  expect(written).toBe(0);
});
