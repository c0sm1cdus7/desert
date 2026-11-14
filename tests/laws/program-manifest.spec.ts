import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { program, shown } from "../support/shop-program.ts";
import { checkProgramCode } from "../program/code.ts";
import { programGroups } from "../program/registration.ts";
import { sameProgramList, summarize } from "../program/manifest.ts";
import { checksInPart } from "../program/parts.ts";
it("refuses a shifted journal list in every affected worker and preserves duplicate occurrences", () => {
  const folder = mkdtempSync(join(tmpdir(), "list-"));
  try {
    for (const name of ["a", "c"]) writeFileSync(join(folder, `${name}.sqlite`), "collect only");
    const compose = () => programGroups({ program, shown, where: "shop", journals: folder });
    const expected = summarize(compose());
    expect(() => sameProgramList(compose(), "")).toThrow(/globalSetup/);
    expect(() => sameProgramList(compose(), expected)).not.toThrow();
    writeFileSync(join(folder, "b.sqlite"), "collect only");
    for (let part = 0; part < 8; part++) expect(() => sameProgramList(compose(), expected)).toThrow(/list changed/);
    const groups = compose();
    expect(summarize([...groups, ...groups])).not.toBe(summarize(groups));
    expect(summarize([...groups].reverse())).not.toBe(summarize(groups));
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
it("spreads nine kept walks across all eight parts with at most two each", () => {
  const folder = mkdtempSync(join(tmpdir(), "walks-"));
  try {
    for (let n = 0; n < 9; n++) writeFileSync(join(folder, `${n}.sqlite`), "collect only");
    const checks = programGroups({ program, shown, where: "shop", journals: folder })[1]?.checks ?? [];
    const counts = Array.from(
      { length: 8 },
      (_, part) => checksInPart(checks, part).filter(check => check.name.includes(" walks ")).length,
    );
    expect(counts).toEqual([1, 1, 2, 1, 1, 1, 1, 1]);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
it.each(["manual", "code"])("counts journals rather than checks in %s mode", async mode => {
  const folder = mkdtempSync(join(tmpdir(), "empty-"));
  try {
    writeFileSync(join(folder, "journal.sqlite.writer.sqlite"), "not a journal");
    mkdirSync(join(folder, "directory.sqlite"));
    const current = { ...program, projectionVersion: mode === "manual" ? "1" : program.projectionVersion };
    for (const journals of [folder, join(folder, "absent")]) {
      const check = programGroups({ program: current, shown, where: "shop", journals })[1]?.checks[0];
      await expect(check?.run()).rejects.toThrow(/keeps no journal/);
    }
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

it("requires the composition itself in code declarations so it cannot conceal a calculation import", () => {
  expect(() => checkProgramCode({ program, shown, where: "undeclared-composition.ts" })).toThrow(
    /undeclared-composition.ts/,
  );
  expect(() => checkProgramCode({ program, shown, where: "tests/support/shop-program.ts" })).not.toThrow();
});
