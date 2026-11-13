// A breadth-first walk of offered answers, whole in its first levels and bounded past them, on a copy for each path.
import type { Path, KeptPath } from "./kept-path.ts";

export const keptWalkLimits = { whole: 2, paths: 64, depth: 24, choices: 16 } as const;
export type WalkLimits = Readonly<{ whole: number; paths: number; depth: number; choices: number }>;
/** The paths that walked the whole levels, those that went past, the places reached, the answers nobody took. */
export type WalkCoverage = Readonly<{ whole: number; paths: number; states: number; clipped: number }>;
/** Every answer offered in the first levels is taken, however many they are: no row of the Menu and no row of what it
 * opens is left out. Past them the bounds cut, and what they cut is counted: coverage that is said, not a claim of
 * exhaustive exploration. Each replay owns and closes its copy. */
export async function breadthFirst(
  replay: (path: Path) => Promise<KeptPath>,
  limits: WalkLimits = keptWalkLimits,
): Promise<WalkCoverage> {
  const queue: { path: Path; depth: number }[] = [{ path: [], depth: 0 }];
  const seen = new Set<string>();
  let whole = 0;
  let paths = 0;
  let clipped = 0;
  for (let next = queue[0]; next && (next.depth <= limits.whole || paths < limits.paths); next = queue[0]) {
    queue.shift();
    const reached = await replay(next.path);
    if (next.depth <= limits.whole) whole++;
    else paths++;
    if (seen.has(reached.fingerprint)) continue;
    seen.add(reached.fingerprint);
    const cut = next.depth < limits.depth ? reached.branches.slice(0, limits.choices) : [];
    const branches = next.depth < limits.whole ? reached.branches : cut;
    clipped += reached.branches.length - branches.length;
    queue.push(...branches.map(branch => ({ path: [...next.path, ...branch], depth: next.depth + 1 })));
  }
  return { whole, paths, states: seen.size, clipped: clipped + queue.length };
}
