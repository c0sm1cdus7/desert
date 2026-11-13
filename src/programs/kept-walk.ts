// A bounded breadth-first walk of offered answers, restoring the saved journal before each path.
import type { Path, KeptPath } from "./kept-path.ts";

export const keptWalkLimits = { paths: 128, depth: 24, choices: 16 } as const;
export type WalkLimits = Readonly<{ paths: number; depth: number; choices: number }>;
export type WalkCoverage = Readonly<{ paths: number; states: number; clipped: number }>;
/** Bounds are explicit coverage, never a claim of exhaustive exploration. Each replay owns and closes its copy. */
export async function breadthFirst(
  replay: (path: Path) => Promise<KeptPath>,
  limits: WalkLimits = keptWalkLimits,
): Promise<WalkCoverage> {
  const queue: { path: Path; depth: number }[] = [{ path: [], depth: 0 }];
  const seen = new Set<string>();
  let paths = 0;
  let clipped = 0;
  while (queue.length && paths < limits.paths) {
    const next = queue.shift();
    if (!next) break;
    const reached = await replay(next.path);
    paths++;
    if (seen.has(reached.fingerprint)) continue;
    seen.add(reached.fingerprint);
    const branches = next.depth < limits.depth ? reached.branches.slice(0, limits.choices) : [];
    clipped += reached.branches.length - branches.length;
    queue.push(...branches.map(branch => ({ path: [...next.path, ...branch], depth: next.depth + 1 })));
  }
  return { paths, states: seen.size, clipped: clipped + queue.length };
}
