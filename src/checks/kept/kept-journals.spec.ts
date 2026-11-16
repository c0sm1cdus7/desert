import "../../../tests/support/fixture-vault.ts";
// A journal an organization wrote, kept by its program: it has to open with the program of today.
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { startHouse } from "../../runtime/house-runtime.ts";
import { keptChecks } from "./kept-journals.ts";
import { shopProgram, shopShown, type Shop } from "../../../tests/support/shop.ts";

const root = mkdtempSync(join(tmpdir(), "desert-kept-spec-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const time = { now: () => 1_000, wait: () => () => {} };
/** A shop that lived a little: ana registered a sale. Its journal is kept in a folder, as a program keeps them. */
function kept(): string {
  const home = join(root, "home");
  const creation = { admin: "ana", assignments: [{ identity: "ana", tools: ["sales", "payments"] }] };
  const house = startHouse<Shop>(home, { by: "shop", creation, ...shopProgram }, time);
  house.tools.act({ act: "attend", input: { target: "sales" } }, 0, "ana");
  const done = house.tools.act(
    { act: "register", target: "sales", input: { sale: "s1", total: 1500 } },
    house.tools.state().through,
    "ana",
  );
  expect(done.status).toBe("accepted");
  house.close();
  const folder = join(root, "journals");
  mkdirSync(folder, { recursive: true });
  copyFileSync(join(home, "journal.sqlite"), join(folder, "shop.sqlite"));
  return folder;
}
const failing = async (checks: ReturnType<typeof keptChecks>): Promise<string[]> => {
  const why: string[] = [];
  for (const check of checks) await check.run().catch((error: unknown) => why.push(String(error)));
  return why;
};

describe("the journals a program keeps", () => {
  const folder = kept();

  it("each open with the program of today: every fact is read and folds, and every thing is read", async () => {
    const checks = keptChecks(shopProgram, shopShown, folder);
    expect(checks.map(check => check.name)).toEqual([
      "the journal kept as shop.sqlite still opens: every fact is read and folds, and every thing is read",
      "the journal kept as shop.sqlite walks every answer offered in its first 2 levels, and past them " +
        "64 paths within 24 levels, 16 choices",
      "the journal kept as shop.sqlite upgrades from previous folds to the complete replay",
      "Manual projectionVersion has reusable kept evidence",
    ]);
    expect(await failing(checks)).toEqual([]);
  });

  it("say, once walked, how much they walked and how many offered answers they left unwalked", async () => {
    const [, walk] = keptChecks(shopProgram, shopShown, folder);
    expect(walk?.report?.()).toBeUndefined();
    await walk?.run();
    const walked =
      /^the journal kept as shop\.sqlite: \d+ paths walked its first levels whole and \d+ went past them, /u;
    const left =
      /, through \d+ places; \d+ offered answers were left unwalked by limits; 0 ramas no recorribles en inspección$/u;
    expect(walk?.report?.()).toMatch(walked);
    expect(walk?.report?.()).toMatch(left);
  });

  it("fail a program that no longer folds a fact they hold: nothing is skipped to make them open", async () => {
    const { step } = shopProgram.slices;
    const sales: typeof step.sales = (kept, event, before) => {
      if (event.kind === "sale-registered") throw new Error("this program does not fold sale-registered");
      return step.sales(kept, event, before);
    };
    const deaf = { ...shopProgram, slices: { ...shopProgram.slices, step: { ...step, sales } } };
    const why = await failing(keptChecks(deaf, shopShown, folder));
    expect(why.length).toBe(4);
    expect(why.every(failure => failure.includes("does not fold sale-registered"))).toBe(true);
    expect(why[0]).toContain("does not fold sale-registered");
    expect(keptChecks(deaf, shopShown, folder).map(check => check.report?.())).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("fail manual evidence where the program keeps none", async () => {
    expect(await failing(keptChecks(shopProgram, shopShown, join(root, "nowhere")))).toEqual([
      expect.stringMatching(/no evidence/),
    ]);
  });
});
