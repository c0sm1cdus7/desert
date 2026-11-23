import { expect, it } from "vitest";
import { breadthFirst } from "./kept-walk.ts";
import { promiseTexts } from "../../texts/promises.texts.ts";
import type { Path } from "./kept-path.ts";
it("counts every blocked branch before deduplicating the state, even if no action completes", async () => {
  const branches: readonly Path[] = [[{ kind: "confirm" }], [{ kind: "cancel" }]];
  const replay = (path: Path) =>
    Promise.resolve(
      path.length
        ? {
            fingerprint: "same state",
            branches: [],
            unavailable: { tool: "vault", action: path[0]?.kind ?? "", reason: "release a credential" },
          }
        : { fingerprint: "start", branches },
    );
  const coverage = await breadthFirst(replay);
  expect(coverage.unavailable).toEqual([
    { tool: "vault", action: "confirm", reason: "release a credential" },
    { tool: "vault", action: "cancel", reason: "release a credential" },
  ]);
  expect(coverage.clipped).toBe(0);
  const report = promiseTexts.keptWalked("todo impedido", coverage);
  expect(report).toContain("2 branches could not be walked under inspection");
  expect(report).toContain("vault/confirm: release a credential");
  expect(report).toContain("vault/cancel: release a credential");
  expect(report).not.toContain("no offered answer was left unwalked");
});
