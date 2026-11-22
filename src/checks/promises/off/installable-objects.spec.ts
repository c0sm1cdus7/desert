import { describe, expect, it } from "vitest";
import { authorOf, authorOnly, objectDistribution } from "../../../../tests/support/installable-objects.ts";
import { programChecks } from "../../program-checks.ts";
import { cast, perform, staged } from "../promised-stage.ts";
import { goTo, menuRows, seated } from "../promised-keys.ts";
import { prefer } from "./promised-preferences.ts";
import { stacksOf } from "../../../surface/menus/lists.ts";
import { toolTexts } from "../../../texts/tools.texts.ts";
import { promiseTexts } from "../../../texts/promises.texts.ts";
import { objectOf } from "../../../tools/installable/destinations.ts";
import { effect } from "../../../house/facts.ts";
import { programKit } from "../../../house/kit-selection.ts";

describe.each([false, true])("object actions in an installable program, two tools: %s", two => {
  const { program, shown } = objectDistribution(two);
  for (const check of programChecks(program, shown)) it(check.name, check.run);
});

it.each([false, true])("keeps object rows, author rules and foreign preferences with shortcut %s", async shortcut => {
  const { program, shown } = objectDistribution(false, shortcut);
  await staged(program, async ({ house, reopen }) => {
    for (const by of [cast.member, cast.admin, cast.outsider]) {
      const seat = seated(house(), by, shown);
      try {
        for (const local of ["same", "a/b#c"]) {
          const target = objectOf("notes", "notes", local);
          seat.router.send({ kind: "menu" });
          goTo(seat, "notes", target);
          const rows = stacksOf({ kind: "view", tool: "notes", target, at: 0 }, seat.tools).flatMap(s => s.rows);
          expect(rows.some(row => row.title === "Cantidad")).toBe(true);
          const actions = rows.filter(row => row.starts);
          expect(actions.map(row => row.starts)).toEqual([{ tool: "notes", act: "notes/edit", target }]);
          const authorReason = by === authorOf(local) ? undefined : authorOnly;
          const reason = by === cast.outsider ? toolTexts.kitRefusal("notes") : authorReason;
          const row = actions[0];
          expect(row).toBeDefined();
          expect(row?.off === true).toBe(reason !== undefined);
          expect(reason === undefined || row?.detail?.endsWith(reason)).toBe(true);
          expect(row?.open).toEqual(
            reason ? undefined : expect.objectContaining({ kind: "act", tool: "notes", act: "notes/edit", target }),
          );
          const result = await perform(house(), "notes", { act: "notes/edit", on: target, input: {}, by });
          expect(result.status).toBe(reason ? "rejected" : "accepted");
          expect(reason === undefined || result.reason === reason).toBe(true);
        }
        seat.router.send({ kind: "menu" });
        await prefer(seat, "foreign", true);
        expect(menuRows(seat.tools).some(row => row.key === "n")).toBe(by !== cast.outsider);
      } finally {
        seat.router.stop();
      }
    }
    reopen();
    const seat = seated(house(), cast.outsider, shown);
    try {
      expect(menuRows(seat.tools).some(row => row.key === "n")).toBe(false);
      await prefer(seat, "foreign", false);
      expect(menuRows(seat.tools).some(row => row.key === "n")).toBe(true);
      house().bus.emit(
        effect("kit-set", { version: 2, holder: cast.outsider, kit: programKit(["notes"]) }, cast.admin),
      );
      const target = objectOf("notes", "notes", "a/b#c");
      goTo(seat, "notes", target);
      const rows = stacksOf({ kind: "view", tool: "notes", target, at: 0 }, seat.tools).flatMap(s => s.rows);
      expect(rows.find(row => row.starts?.act === "notes/edit")?.open).toBeDefined();
      expect(
        (await perform(house(), "notes", { act: "notes/edit", on: target, input: {}, by: cast.outsider })).status,
      ).toBe("accepted");
    } finally {
      seat.router.stop();
    }
  });
});

it("keeps two tools' identically named and encoded objects separate even without the kit", async () => {
  const { program, shown } = objectDistribution(true);
  await staged(program, ({ house }) => {
    const seat = seated(house(), cast.outsider, shown);
    try {
      for (const group of ["notes", "shared"]) {
        for (const local of [undefined, "same", "a/b#c"]) {
          const target = local === undefined ? `notes/${group}` : objectOf("notes", group, local);
          seat.router.send({ kind: "menu" });
          goTo(seat, "notes", target);
          const actions = stacksOf({ kind: "view", tool: "notes", target, at: 0 }, seat.tools)
            .flatMap(s => s.rows)
            .filter(row => row.starts);
          expect(actions.map(row => row.starts)).toEqual([
            { tool: "notes", act: `${group}/${local === undefined ? "note" : "edit"}`, target },
          ]);
          expect(actions[0]?.off).toBe(true);
          expect(actions[0]?.detail?.endsWith(toolTexts.kitRefusal("notes"))).toBe(true);
          expect(actions[0]?.open).toBeUndefined();
        }
      }
    } finally {
      seat.router.stop();
    }
    return Promise.resolve();
  });
});

it.each(["missing", "enabled", "wrong-reason"])("still rejects a broken foreign object row: %s", async defect => {
  const { program, shown } = objectDistribution(true);
  const screen = shown.screens?.notes;
  if (!screen) throw new Error("Missing notes screen");
  const broken = {
    ...shown,
    screens: {
      ...shown.screens,
      notes: (...args: Parameters<typeof screen>) => {
        const plain = screen(...args);
        return {
          ...plain,
          actsOn: Object.fromEntries(
            Object.entries(plain.actsOn ?? {}).map(([name, act]) => [
              name,
              name !== "shared/edit" || args[0].me !== cast.outsider
                ? act
                : {
                    ...act,
                    ...(defect === "missing"
                      ? { listed: () => false }
                      : { off: () => (defect === "enabled" ? undefined : authorOnly) }),
                  },
            ]),
          ),
        };
      },
    },
  };
  const check = programChecks(program, broken).find(check => check.name === `notes · ${promiseTexts.foreign}`);
  expect(check).toBeDefined();
  await expect(check?.run()).rejects.toThrow();
});
