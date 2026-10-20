import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";

const require = createRequire(import.meta.url);

/** Private compatibility bridge, not a product import or a second lock owner.
 * Bits 2.19.2 does not export ScrollLock and reads preventScroll only on mount.
 * Adaptive surfaces mount that installed component with their modal lifetime,
 * preserving Bits' shared lock stack while their form stays mounted. Any
 * dependency upgrade must explicitly review this path and lifecycle contract. */
export function resolveBitsScrollLock(entry: string = require.resolve("bits-ui")): string {
  const root = dirname(dirname(entry));
  const installed: unknown = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  if (!installed || typeof installed !== "object" || !("name" in installed) ||
    installed.name !== "bits-ui" || !("version" in installed) || installed.version !== "2.19.2") {
    throw new Error("UNREVIEWED_BITS_SCROLL_LOCK_VERSION");
  }
  const file = join(root, "dist/bits/utilities/scroll-lock/scroll-lock.svelte");
  if (!existsSync(file)) throw new Error("BITS_SCROLL_LOCK_ENTRY_MISSING");
  return file;
}
