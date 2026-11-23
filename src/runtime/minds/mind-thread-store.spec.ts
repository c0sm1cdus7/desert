import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { openMindThreads } from "./mind-thread-store.ts";
const scope = { actor: "mind:notes" };
it("restores cuts per actor and process without swallowing late arrivals", () => {
  const home = mkdtempSync(join(tmpdir(), "mind-thread-"));
  const entries = [
    { seq: 1, id: "a", text: "Antes" },
    { seq: 2, id: "b", text: "Actual" },
  ];
  try {
    const store = openMindThreads(home);
    store.compact(scope, entries, { through: 3, keep: ["b"] });
    const next = openMindThreads(home);
    const arrived = [...entries, { seq: 3, id: "late", text: "Llegó después del corte" }];
    expect(next.read(scope, arrived).entries.map(item => item.id)).toEqual(["b", "late"]);
    expect(next.read({ ...scope, process: "journey" }, entries).entries).toEqual(entries);
    next.compact(scope, arrived, { through: 3, keep: ["late"] });
    expect(
      openMindThreads(home)
        .read(scope, arrived)
        .entries.map(item => item.id),
    ).toEqual(["late"]);
    expect(() => next.read(scope, [])).toThrow("thread.reference");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
it("neither ignores a corrupt cut nor rewrites the file when rejecting references", () => {
  const home = mkdtempSync(join(tmpdir(), "mind-thread-"));
  try {
    const store = openMindThreads(home);
    expect(() => store.compact(scope, [], { through: 0, keep: ["absent"] })).toThrow("Invalid thread references");
    writeFileSync(join(home, "mind-threads.json"), JSON.stringify({ version: 9, threads: [] }));
    expect(() => openMindThreads(home)).toThrow("thread.store");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
