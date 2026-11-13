// Reclaim only this workspace's old, abandoned check houses; a live process and an unrelated folder are untouchable.
import { createHash } from "node:crypto";
import { lstatSync, mkdtempSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const workspace = createHash("sha256").update(realpathSync(process.cwd())).digest("hex").slice(0, 16);
export const promisePrefix = `desert-promise-${workspace}-`;
export const promiseMaxAge = 24 * 60 * 60 * 1000;
const codeOf = (error: unknown): unknown => (error instanceof Error && "code" in error ? error.code : undefined);
function running(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return codeOf(error) !== "ESRCH";
  }
}
/** Never follow symlinks; tolerate a concurrent worker having already reclaimed the same abandoned folder. */
export function reapPromises(root = tmpdir(), now = Date.now(), alive: (pid: number) => boolean = running): void {
  for (const name of readdirSync(root)) {
    if (!name.startsWith(promisePrefix)) continue;
    const pid = Number(name.slice(promisePrefix.length).split("-")[0]);
    if (!Number.isSafeInteger(pid) || pid <= 0 || alive(pid)) continue;
    const path = join(root, name);
    try {
      const stat = lstatSync(path);
      if (stat.isDirectory() && now - stat.mtimeMs > promiseMaxAge) rmSync(path, { recursive: true, force: true });
    } catch (error) {
      if (codeOf(error) !== "ENOENT") throw error;
    }
  }
}
const swept = new Set<string>();
/** Standalone derived checks get the same startup sweep as the repository's test runner. */
export function promiseHome(): string {
  const root = tmpdir();
  if (!swept.has(root)) {
    reapPromises(root);
    swept.add(root);
  }
  return mkdtempSync(join(root, `${promisePrefix}${process.pid}-`));
}
