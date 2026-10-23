import { lstat, readdir, readFile } from "node:fs/promises";
import { posix, resolve } from "node:path";

export type NonvisualSource = Readonly<{ path: string; source: string }>;
const interpreterRoots = ["src/web/client"] as const;

/** The interpreter remains nonvisual even when a catalog owner hosts it.
 * Dormant helpers have the same boundary as currently imported helpers. */
export async function readInterpreterSources(root: string): Promise<readonly NonvisualSource[]> {
  const sources: NonvisualSource[] = [];
  const fail = (path: string, reason: string): never => { throw new Error(`NONVISUAL_DEPENDENCY: ${path}: ${reason}`); };
  async function visit(path: string): Promise<void> {
    const stat = await lstat(resolve(root, path));
    if (stat.isSymbolicLink()) fail(path, "symlinked interpreter source");
    if (stat.isDirectory()) {
      for (const entry of (await readdir(resolve(root, path))).sort()) await visit(posix.join(path, entry));
    } else {
      if (!stat.isFile() || !/\.(ts|[cm]?js)$/.test(path)) fail(path, "unregistered interpreter source");
      sources.push({ path, source: await readFile(resolve(root, path), "utf8") });
    }
  }
  for (const path of interpreterRoots) {
    try {
      const parts = path.split("/");
      for (let index = 1; index <= parts.length; index++) {
        const parent = parts.slice(0, index).join("/");
        const stat = await lstat(resolve(root, parent));
        if (stat.isSymbolicLink()) fail(parent, "symlinked interpreter source");
        if (!stat.isDirectory()) fail(parent, "interpreter root must be a directory");
      }
      await visit(path);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("NONVISUAL_DEPENDENCY:")) throw error;
      fail(path, "unresolved interpreter source");
    }
  }
  return sources;
}
