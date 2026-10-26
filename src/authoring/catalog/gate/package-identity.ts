// Rule U's trust in installed packages, by identity, never by where the gate happens to run. The checkout's own
// node_modules is trusted as it is. A product that installs DESERT beside its own packages (`desert-sdk: file:../desert`)
// may hand the checker a file from its own node_modules; that file is the package only when it is the same package, byte
// for byte the checkout's copy at the version the checkout installs, and lies outside the judged tree. A judged tree can
// therefore never make the checker believe a module is trusted: whatever it holds (a fake `node_modules/@types/node`, a
// symbolic link) is judged as a tree file.
import { readFileSync, realpathSync } from "node:fs";
import { join, posix, relative, resolve } from "node:path";

// Real paths: TypeScript hands over resolved files, so a symlinked node_modules or checkout must compare the same.
export const checkout = realpathSync(resolve(import.meta.dirname, "../../../.."));
export const packages = realpathSync(join(checkout, "node_modules"));

export const inside = (file: string, folder: string) => {
  const path = relative(folder, file);
  return path !== "" && !path.startsWith("..") && !posix.isAbsolute(path);
};
const slashes = (path: string) => path.split("\\").join("/");

/** An installed package's file: the package's name and the file's path inside node_modules (`@types/node/fs.d.ts`). */
export type PackageFile = Readonly<{ name: string; at: string }>;

/** The package a `…/node_modules/<name>/…` path belongs to: the innermost node_modules folder; a scoped name has two parts. */
function packagePath(file: string): Readonly<{ folder: string; name: string; within: string }> | undefined {
  const parts = slashes(file).split("/"), last = parts.lastIndexOf("node_modules");
  if (last < 0) return undefined;
  const width = parts[last + 1]?.startsWith("@") ? 2 : 1, name = parts.slice(last + 1, last + 1 + width);
  if (name.length !== width || name.some(part => !part || part === "." || part === "..")) return undefined;
  return { folder: parts.slice(0, last + 1 + width).join("/"), name: name.join("/"), within: parts.slice(last + 1 + width).join("/") };
}

const manifest = (folder: string): Readonly<{ name?: unknown; version?: unknown }> | undefined => {
  try { return JSON.parse(readFileSync(join(folder, "package.json"), "utf8")); } catch { return undefined; }
};
const real = (path: string) => { try { return realpathSync(path); } catch { return undefined; } };
const sameBytes = (one: string, other: string) => { try { return readFileSync(one).equals(readFileSync(other)); } catch { return false; } };

/** A copy outside the checkout keeps its identity for the process: the checkout's packages do not change under the gate. */
const copies = new Map<string, PackageFile | undefined>();

/** The installed package a checker file belongs to, or undefined (a tree file). Inside the checkout's node_modules it is
 * that package. Elsewhere it is the package only when its real path lies in `node_modules/<name>/` outside the judged tree,
 * that folder's package.json names <name> at the version the checkout installs, and the file's bytes are the checkout's
 * own copy's. A tree file, a folder named like a package outside node_modules, another version or an edited copy is not. */
export function installedPackage(file: string, judged: string): PackageFile | undefined {
  const at = real(file), root = real(judged);
  if (!at || !root) return undefined;
  if (inside(at, packages)) {
    const own = packagePath(join("node_modules", relative(packages, at)));
    return own && { name: own.name, at: slashes(relative(packages, at)) };
  }
  if (inside(at, root) || at === root) return undefined;
  if (copies.has(at)) return copies.get(at);
  const found = packagePath(at);
  let identity: PackageFile | undefined;
  if (found?.within) {
    const ours = join(packages, found.name), theirs = manifest(found.folder), installed = manifest(ours), copy = real(join(ours, found.within));
    const sameVersion = theirs?.name === found.name && installed?.name === found.name && typeof installed.version === "string"
      && theirs.version === installed.version;
    if (sameVersion && copy && inside(copy, packages) && sameBytes(at, copy)) identity = { name: found.name, at: `${found.name}/${found.within}` };
  }
  copies.set(at, identity);
  return identity;
}
