// Rule U's trust in installed packages, by identity, never by where the gate happens to run. A file in the checkout's
// node_modules is a package when it lies inside a real package root: a folder whose package.json names it, never a
// dot-folder (`.cache`, `.vite-temp`) or a loose file. A product that installs DESERT beside its own packages
// (`desert-sdk: file:../desert`) may hand the checker a file from its own node_modules; that file is the package only when
// it lies outside the judged tree, every package root it passes through is named and versioned as the checkout's, and the
// text the checker parsed is the checkout's copy's. A judged tree can therefore never make the checker believe a module
// is trusted: whatever it holds (a fake `node_modules/@types/node`, a symbolic link) is judged as a tree file.
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
const real = (path: string) => { try { return realpathSync(path); } catch { return undefined; } };

/** An installed package's file: the outermost package's name and the file's path inside node_modules
 * (`svelte/node_modules/is-reference/src/index.d.ts` belongs to svelte, as everything Svelte installs is Svelte's). */
export type PackageFile = Readonly<{ name: string; at: string }>;

/** The package roots a path inside one node_modules folder passes through, outermost first: `svelte/node_modules/x/f.d.ts`
 * passes svelte, then svelte/node_modules/x. The one place that decides package roots, for the checkout's files, for copies
 * and for the platform rule. Undefined for a path that is not a file inside package folders: a dot-folder, an empty part,
 * a scope without a name, or a package folder itself. */
export function packageRoots(path: string): readonly Readonly<{ folder: string; name: string }>[] | undefined {
  const parts = slashes(path).split("/"), roots: { folder: string; name: string }[] = [];
  for (let index = 0; ;) {
    const width = parts[index]?.startsWith("@") ? 2 : 1, name = parts.slice(index, index + width);
    if (name.length !== width || name.some(part => !part || part.startsWith(".")) || width === 2 && name[0] === "@") return undefined;
    index += width;
    roots.push({ folder: parts.slice(0, index).join("/"), name: name.join("/") });
    if (parts[index] !== "node_modules") return index < parts.length ? roots : undefined;
    index += 1;
  }
}

type Manifest = Readonly<{ name?: unknown; version?: unknown }> | undefined;

/** Rule U's package trust for one checker program: the installed package each of its files belongs to, or undefined (a
 * tree file). Whatever it reads is kept for this program only; a later program reads the disk again. */
export function packageTrust(judged: string): (file: string, text: string) => PackageFile | undefined {
  const manifests = new Map<string, Manifest>(), root = real(judged);
  const manifest = (folder: string): Manifest => {
    if (!manifests.has(folder)) {
      let read: Manifest;
      try { read = JSON.parse(readFileSync(join(folder, "package.json"), "utf8")); } catch { read = undefined; }
      manifests.set(folder, read);
    }
    return manifests.get(folder);
  };
  // A package root is a folder whose package.json names the package.
  const named = (base: string, roots: NonNullable<ReturnType<typeof packageRoots>>) => roots.every(({ folder, name }) => manifest(join(base, folder))?.name === name);
  return (file, text) => {
    const at = real(file);
    if (!at || !root) return undefined;
    const own = inside(at, packages);
    // A file in the judged tree is a tree file; the checkout's own install is a package when the tree holds the checkout
    // (DESERT judging itself), never when the tree lies inside it.
    if ((inside(at, root) || at === root) && !(own && inside(packages, root))) return undefined;
    if (own) {
      const path = slashes(relative(packages, at)), roots = packageRoots(path);
      return roots && named(packages, roots) ? { name: roots[0]!.name, at: path } : undefined;
    }
    // A copy is judged from the outermost package the checkout installs (as the checkout's own files are): every root on its
    // path named and versioned as the checkout's, and the parsed text the checkout's file's. A product nested in another
    // node_modules (`…/node_modules/product/node_modules/…`) is passed over; a package's nested dependency is never re-read
    // as a hoisted one.
    const parts = slashes(at).split("/");
    for (let index = parts.indexOf("node_modules"); index >= 0; index = parts.indexOf("node_modules", index + 1)) {
      const base = parts.slice(0, index + 1).join("/"), path = parts.slice(index + 1).join("/"), roots = packageRoots(path);
      const same = ({ folder, name }: Readonly<{ folder: string; name: string }>) => {
        const theirs = manifest(join(base, folder)), ours = manifest(join(packages, folder));
        return theirs?.name === name && ours?.name === name && typeof ours.version === "string" && theirs.version === ours.version;
      };
      if (!roots || !same(roots[0]!)) continue;
      const copy = real(join(packages, path));
      return roots.every(same) && copy && inside(copy, packages) && sameText(text, copy) ? { name: roots[0]!.name, at: path } : undefined;
    }
    return undefined;
  };
}

/** Whether the text the checker parsed is the file's, decoded as TypeScript reads it (UTF-8 without its byte order mark).
 * A UTF-16 file is never the same: its decoding is not this one's. */
function sameText(text: string, file: string): boolean {
  let bytes: Buffer;
  try { bytes = readFileSync(file); } catch { return false; }
  if (bytes[0] === 0xfe && bytes[1] === 0xff || bytes[0] === 0xff && bytes[1] === 0xfe) return false;
  const bom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
  return bytes.toString("utf8", bom) === text;
}
