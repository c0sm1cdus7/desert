import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { home } from "../../tests/support/upgrade-support.ts";

it.each([false, true])("recalculates 10 as 20 across processes, with rebuild interruption: %s", interrupted => {
  const path = home();
  for (const mode of ["old", ...(interrupted ? ["crash"] : []), "update", "reopen"]) {
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        fileURLToPath(new URL("../../tests/support/upgrade-hook.mjs", import.meta.url)),
        fileURLToPath(new URL("../../tests/support/upgrade-process.mjs", import.meta.url)),
        mode,
        path,
      ],
      { encoding: "utf8", timeout: 20_000 },
    );
    if (mode === "crash") {
      expect(result.signal, result.stderr).toBe("SIGKILL");
      continue;
    }
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      mode,
      total: mode === "old" ? 10 : 20,
      replay: mode === "old" ? 10 : 20,
    });
  }
});
