// Hash every byte and relative path in the declared code trees once, while composing an immutable release.
import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
/** Include every code dependency that can change a calculation; paths are relative so a release can move. */
export function projectionVersion(trees: readonly string[]): string {
  if (!trees.length) throw new Error("projectionVersion needs at least one code tree");
  const hash = createHash("sha256");
  const frame = (value: string | Uint8Array) => {
    const bytes = typeof value === "string" ? Buffer.from(value) : value;
    hash.update(`${bytes.length}:`);
    hash.update(bytes);
  };
  frame("desert-code-trees/1");
  frame(process.versions.node);
  const visit = (root: string, path: string) => {
    const file = join(root, path);
    const name = path.split("/").at(-1) ?? "";
    if (/^(?:\.env.*|auth\.json|secrets\.sqlite.*)$/i.test(name) || /\.(?:pem|key|p12|pfx|crt)$/i.test(name))
      throw new Error("A code tree contains a private file; declare only code trees");
    const stat = lstatSync(file);
    if (stat.isSymbolicLink()) throw new Error("Code trees cannot contain symbolic links");
    frame(path);
    if (stat.isDirectory()) {
      frame("directory");
      for (const child of readdirSync(file).sort()) visit(root, path ? `${path}/${child}` : child);
    } else if (stat.isFile()) {
      frame("file");
      frame(readFileSync(file));
    } else throw new Error("Code trees can contain only directories and regular files");
  };
  for (const tree of trees) {
    if (!lstatSync(tree).isDirectory()) throw new Error("A declared code tree is not a directory");
    visit(tree, "");
  }
  return hash.digest("hex");
}
