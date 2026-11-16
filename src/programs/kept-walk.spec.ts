import "../../tests/support/fixture-vault.ts";
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
import type { Path } from "./kept-path.ts";
import { breadthFirst } from "./kept-walk.ts";
import { startHouse } from "./house-runtime.ts";

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
  const house = startHouse(home, { ...shopProgram, by: "shop", creation }, time);
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
  const check = keptChecks(program, shown, folder).find(check => check.name.includes("walks every answer offered"));
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

const wordless: Shown<Shop> = {
  ...shopShown,
  screens: {
    sales: (ports, tool, words, acts, start) => {
      const plain = anyToolScreen(ports, tool, words, acts, start);
      return {
        ...plain,
        acts: Object.fromEntries(Object.entries(plain.acts).map(([name, act]) => [name, { ...act, off: () => "" }])),
      };
    },
  },
};

describe("breadth-first exploration of saved journals", () => {
  /** A place that offers the same answers wherever it is reached, each path being a place of its own. */
  const offering = (branches: readonly Path[], order: number[]) => (path: Path) => {
    order.push(path.length);
    return Promise.resolve({ fingerprint: String(order.length), branches });
  };
  it("counts depth and branch limits explicitly and visits breadth before depth", async () => {
    const order: number[] = [];
    const two: readonly Path[] = [[{ kind: "confirm" }], [{ kind: "cancel" }]];
    const coverage = await breadthFirst(offering(two, order), { whole: 0, paths: 4, depth: 2, choices: 2 });
    expect(order).toEqual([0, 1, 1, 2, 2]);
    expect(coverage).toEqual({ whole: 1, paths: 4, states: 5, clipped: 6, unavailable: [] });
  });
  it("takes every answer offered in its first levels, however many, and bounds only what comes after", async () => {
    const order: number[] = [];
    const five = Array.from({ length: 5 }, (): Path => [{ kind: "confirm" }]);
    const coverage = await breadthFirst(offering(five, order), { whole: 2, paths: 3, depth: 24, choices: 1 });
    expect(order).toEqual([0, ...Array<number>(5).fill(1), ...Array<number>(25).fill(2), 3, 3, 3]);
    /** Cut: four of five answers at each of the 25 places of the second level and at each of the 3 past it, and
     * the 22 + 3 paths that were waiting when the paths ran out. */
    expect(coverage).toEqual({ whole: 31, paths: 3, states: 34, clipped: 25 * 4 + 3 * 4 + 22 + 3, unavailable: [] });
  });
  it("leaves nothing unwalked where the bounds cut nothing, and enters the same place once", async () => {
    const two: readonly Path[] = [[{ kind: "confirm" }], [{ kind: "cancel" }]];
    const ends = (path: Path) =>
      Promise.resolve({ fingerprint: String(path.length), branches: path.length ? [] : two });
    expect(await breadthFirst(ends)).toEqual({ whole: 3, paths: 0, states: 2, clipped: 0, unavailable: [] });
  });
  it("checks outside errors and fails internal errors without cases, preserving the original", async () => {
    const folder = saved();
    const file = join(folder, "shop.sqlite");
    const before = readFileSync(file);
    await walked(programWith(print), folder);
    expect(readFileSync(file)).toEqual(before);
    const broken = { ...print };
    Reflect.set(broken, "outside", []);
    await expect(walked(programWith(broken), folder)).rejects.toThrow("failed internally");
    expect(readFileSync(file)).toEqual(before);
    await expect(walked(programWith(print), folder, empty)).rejects.toThrow("nothing eligible");
    const off = { ...print, offered: () => "" };
    await expect(walked(programWith(off), folder)).rejects.toMatchObject({
      detail: "An act refused with a cause it does not declare: ",
    });
    await expect(walked(programWith(print), folder, wordless)).rejects.toThrow("disabled row has no reason");
  });
});
