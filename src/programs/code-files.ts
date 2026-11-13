// Preflight the whole declaration using metadata only, before reading any code bytes.
import { lstatSync, readdirSync, realpathSync } from "node:fs";
import { basename, dirname, extname, join, resolve, sep } from "node:path";
import { journalTexts } from "../texts/journal.texts.ts";
const storage = (name: string) => /(?:\.(?:sqlite|sqlite3|db)(?:$|[-.])|^journal\.lock$)/i.test(name);
function outsideOrganization(folder: string) {
  for (let path = folder; ; path = dirname(path)) {
    if (readdirSync(path).some(storage)) throw new Error("Code tree contains or is under an organization journal");
    if (dirname(path) === path) break;
  }
}
export type CodeFile = Readonly<{ file: string; name: string }>;
export function codeFiles(roots: readonly string[], extensions: readonly string[]): CodeFile[] {
  if (!roots.length || !extensions.length || extensions.some(ext => !/^\.[a-z0-9]+$/i.test(ext)))
    throw new Error("Declare code paths and explicit filename extensions");
  const files: CodeFile[] = [];
  const visit = (file: string, name: string, underHidden = false) => {
    const hidden = underHidden || basename(file).startsWith(".");
    if (/^(?:auth\.json|secrets\.sqlite.*)$/i.test(basename(file)) || /\.(?:pem|key|p12|pfx|crt)$/i.test(file))
      throw new Error("A private file is not code");
    const stat = lstatSync(file);
    if (hidden && !stat.isDirectory()) return;
    if (stat.isSymbolicLink()) throw new Error("Code trees cannot contain symbolic links");
    if (stat.isDirectory()) {
      const names = readdirSync(file).sort();
      if (names.some(storage)) throw new Error("Code tree contains an organization journal");
      for (const child of names) visit(join(file, child), `${name}/${child}`, hidden);
    } else if (!stat.isFile() || stat.nlink !== 1) throw new Error(journalTexts.invalidCodeFile);
    else if (!hidden && extensions.includes(extname(file))) files.push({ file, name });
  };
  for (const [index, root] of roots.entries()) {
    const file = resolve(root);
    if (file.split(sep).some(part => part.startsWith("."))) throw new Error("Hidden code roots are excluded");
    outsideOrganization(dirname(realpathSync(file)));
    if (storage(basename(file))) throw new Error("A journal is not code");
    visit(file, `${index}/${lstatSync(file).isDirectory() ? "" : basename(file)}`);
  }
  return files;
}
