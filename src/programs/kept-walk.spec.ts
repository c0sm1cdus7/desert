// Saved records expose failures no declared case happens to reach; each branch must start from its own copy.
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { object } from "../catalogs/acts.ts";
import { oneOf, option } from "../catalogs/fields.ts";
import { anyToolScreen } from "../surface/bridge/any-tool.ts";
import type { Shown } from "../surface/bridge/house-ports.ts";
import { programAct, type Composition, type ProgramAct } from "../tools/promises.ts";
import { shopProgram, shopShown, type Shop } from "../../tests/support/shop.ts";
import { keptChecks } from "./kept-journals.ts";
import { breadthFirst } from "./kept-walk.ts";
import { startHouse } from "./house-runtime.ts";
import { MemoryKeys } from "../../tests/support/shop-rig.ts";

const root = mkdtempSync(join(tmpdir(), "desert-kept-walk-spec-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const input = object({ mode: oneOf("Salida", option("Bien", "Bien", "b"), option("Falla", "Falla", "f")) });
const outside = ["printer offline"] as const;
const print = programAct<Shop, typeof input, typeof outside>({
  name: "imprimir",
  enter: "imprimir",
  purpose: "el recibo",
  key: "i",
  undoable: true,
  on: "tool",
  input,
  outside,
  run: ({ mode }) =>
    mode === "Bien"
      ? { status: "accepted", text: "Impreso · Recibo" }
      : { status: "rejected", reason: "printer offline" },
  cases: [{ promise: "prints", input: { mode: "Bien" }, then: { says: "Impreso · Recibo", facts: [] } }],
});
const programWith = (act: ProgramAct<Shop>): Composition<Shop> => ({
  ...shopProgram,
  registry: shopProgram.registry.map(tool => (tool.id === "sales" ? { ...tool, acts: { print: act } } : tool)),
});
/** Copy only the journal supplied by this test's house; no stored credential is opened or copied. */
function saved(): string {
  const folder = join(root, "journals");
  const home = join(root, "home");
  mkdirSync(folder, { recursive: true });
  const creation = { admin: "ana", assignments: [{ identity: "ana", tools: ["sales", "payments"] }] };
  const time = { now: () => 1000, wait: () => () => {} };
  const house = startHouse(home, { ...shopProgram, by: "shop", creation, keys: new MemoryKeys() }, time);
  try {
    house.tools.act({ act: "attend", input: { target: "sales" } }, 0, "ana");
    const result = house.tools.act({ act: "register", target: "sales", input: { sale: "s1", total: 1500 } }, 0, "ana");
    expect(result.status).toBe("accepted");
  } finally {
    house.close();
  }
  copyFileSync(join(home, "journal.sqlite"), join(folder, "shop.sqlite"));
  return folder;
}
const walked = async (program: Composition<Shop>, folder: string, shown = shopShown) => {
  const check = keptChecks(program, shown, folder).find(check => check.name.includes("walks offered"));
  expect(check).toBeDefined();
  await check?.run();
};
const empty: Shown<Shop> = {
  ...shopShown,
  screens: {
    sales: (ports, tool, words, acts, start) => {
      const plain = anyToolScreen(ports, tool, words, acts, start);
      return {
        ...plain,
        acts: Object.fromEntries(
          Object.entries(plain.acts).map(([name, act]) => [
            name,
            { ...act, next: () => ({ kind: "one", ask: "Salida", options: [] }) },
          ]),
        ),
      };
    },
  },
};

describe("breadth-first exploration of saved journals", () => {
  it("counts depth and branch limits explicitly and visits breadth before depth", async () => {
    const order: number[] = [];
    const coverage = await breadthFirst(
      path => {
        order.push(path.length);
        return Promise.resolve({
          fingerprint: String(order.length),
          branches: [[{ kind: "confirm" }], [{ kind: "cancel" }]],
        });
      },
      { paths: 4, depth: 2, choices: 2 },
    );
    expect(order).toEqual([0, 1, 1, 2]);
    expect(coverage).toEqual({ paths: 4, states: 4, clipped: 5 });
  });
  it("checks outside errors and fails internal errors without cases, preserving the original", async () => {
    const folder = saved();
    const file = join(folder, "shop.sqlite");
    const before = readFileSync(file);
    await walked(programWith(print), folder);
    expect(readFileSync(file)).toEqual(before);
    const broken = { ...print, outside: [] };
    await expect(walked(programWith(broken), folder)).rejects.toThrow("failed internally");
    expect(readFileSync(file)).toEqual(before);
    await expect(walked(programWith(print), folder, empty)).rejects.toThrow("nothing eligible");
    const off = { ...print, offered: () => "" };
    await expect(walked(programWith(off), folder)).rejects.toThrow("disabled row has no reason");
  });
});
