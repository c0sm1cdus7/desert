import { expect, it, vi } from "vitest";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { fixture, words, time } from "../../tests/support/secret-rig.ts";
import * as protection from "../adapters/secrets/positions/protected-house.ts";
import { SqliteJournal } from "../adapters/storage/journal-store.ts";
import { startHouse } from "./house-runtime.ts";
it("H4: caracteriza la ventana pendiente entre revisar la historia y tomar el escritor", () => {
  const rig = fixture();
  rig.close();
  rmSync(join(rig.path, "secret-protection.json"));
  const previous = new SqliteJournal(join(rig.path, "journal.sqlite"), words);
  const original = protection.protectedHouse;
  const spy = vi.spyOn(protection, "protectedHouse").mockImplementation((home, options) => {
    const reviewed = original(home, options);
    previous.append(words.fact("sale-registered", { value: "inventado", copy: "público" }, "ana"), 1000);
    previous.close();
    return reviewed;
  });
  try {
    const opened = startHouse(rig.path, rig.options, time);
    try {
      expect(
        opened.tools.state().tools.vault.some(e => e.kind === "sale-registered" && e.data.value === "inventado"),
      ).toBe(true);
    } finally {
      opened.close();
    }
  } finally {
    spy.mockRestore();
    previous.close();
  }
  // The written mark also skips that fact at the next ordinary opening.
  rig.restart();
  expect(rig.facts().some(e => e.kind === "sale-registered" && e.data.value === "inventado")).toBe(true);
});
