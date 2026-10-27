// Rule T, static half. Law: the template's static folder serves only files a foundation declares in its `assets`, each
// declared by exactly one foundation and present there. Raises UNQUALIFIED_ARTIFACT naming the asset or the declaration.
import type { GateContext } from "./context.ts";
import { violation, type Violation } from "./violation.ts";

const code = "UNQUALIFIED_ARTIFACT";

/** Which foundations declare each asset name, and where each declaration is. */
function declaredAssets(context: GateContext): ReadonlyMap<string, readonly { id: string; path: string }[]> {
  const owners = new Map<string, { id: string; path: string }[]>();
  for (const { path, declaration } of context.declarations) if (declaration.kind === "foundation") {
    for (const asset of declaration.assets ?? []) owners.set(asset, [...owners.get(asset) ?? [], { id: declaration.id, path }]);
  }
  return owners;
}

export function staticAssetViolations(context: GateContext, staticFolder: string): readonly Violation[] {
  const found: Violation[] = [], owners = declaredAssets(context);
  const served = new Set(context.paths.filter(path => path.startsWith(staticFolder)).map(path => path.slice(staticFolder.length)));
  for (const name of served) {
    const path = `${staticFolder}${name}`, declaring = owners.get(name) ?? [];
    if (!declaring.length) found.push(violation(code, path, 1, "a static asset of the template is not a declared asset of a foundation"));
    if (declaring.length > 1) {
      found.push(violation(code, path, 1, `the static asset ${name} is declared by more than one foundation: ${declaring.map(item => item.id).join(", ")}`));
    }
  }
  for (const [name, declaring] of owners) if (!served.has(name)) for (const { id, path } of declaring) {
    found.push(violation(code, path, 1, `${id} declares the asset ${name}, which is not in ${staticFolder}`));
  }
  return found;
}
