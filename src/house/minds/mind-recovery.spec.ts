import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { SqliteJournal } from "../../storage/journal-store.ts";
import { vocabulary } from "../../journal/vocabulary.ts";
import { emptyHouse, houseStep } from "../members.ts";
import { effect } from "../facts.ts";
import { mindEffects } from "../../../tests/support/mind-facts.ts";
it("cerrar SQLite y reabrir reconstruye todos los contratos sin cambiar autorías ni liberar incertidumbre", () => {
  const dir = mkdtempSync(join(tmpdir(), "mind-contracts-"));
  const file = join(dir, "house.sqlite");
  const words = vocabulary({});
  let journal = new SqliteJournal(file, words);
  try {
    const state = journal.watch("mind-contracts", emptyHouse, houseStep);
    journal.restore();
    let at = 0;
    const emit = (event: Parameters<typeof journal.append>[0]) => journal.append(event, ++at);
    emit(effect("house-created", {}, "ana"));
    emit(effect("granted", { identity: "beto", tools: ["sales"] }, "ana"));
    emit(effect("granted", { identity: "nora", tools: [] }, "ana"));
    emit(effect("scene", { general: "Antes" }, "nora"));
    emit(effect("removed", { identity: "nora" }, "ana"));
    emit(effect("assistant-enabled", { owner: "beto", name: "Nora" }, "ana"));
    emit(effect("assistant-adopted", { owner: "beto", legacy: "nora" }, "ana"));
    emit(effect("assistant-kit-set", { owner: "beto", kit: [{ tool: "sales", acts: ["forge"] }] }, "beto"));
    emit(
      effect("mind-card-assigned", { mind: "assistant:beto", card: "test", version: "v1", capabilities: [] }, "ana"),
    );
    for (const event of mindEffects("assistant:beto", "ana").filter(
      event =>
        event.kind.startsWith("journey-") ||
        (event.kind.startsWith("mind-") && event.kind !== "mind-card-assigned") ||
        ["model-call-reserved", "model-call-started", "model-call-uncertain"].includes(event.kind),
    ))
      emit(event);
    const before = state();
    journal.close();
    journal = new SqliteJournal(file, words);
    const reopened = journal.watch("mind-contracts", emptyHouse, houseStep);
    journal.restore();
    expect(reopened()).toEqual(before);
    expect(reopened().scenes.get("nora")?.by).toBe("nora");
    expect(reopened().modelCalls.get("c1")?.status).toBe("uncertain");
    expect(reopened().journeys.get("j1")?.closed?.by).toBe("assistant:beto");
    expect(reopened().mindCards.get("assistant:beto")).toEqual([]);
  } finally {
    journal.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
