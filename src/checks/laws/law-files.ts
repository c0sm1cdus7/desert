// The code of a repository as a law reads it: its root and its code folders, each one present and holding code.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import ts from "typescript";

/** A repository as a law sees it: where it lives, and the folders that hold its code (`src`, `arranque`…). */
export type Repository = Readonly<{ root: string; code: readonly string[] }>;

/** Every file under a folder but what is no code: the installed packages and the hidden folders of the tooling. */
export function filesUnder(folder: string, accept: (path: string) => boolean): string[] {
  return readdirSync(folder).flatMap(name => {
    const path = join(folder, name);
    if (name === "node_modules" || name.startsWith(".")) return [];
    if (statSync(path).isDirectory()) return filesUnder(path, accept);
    return accept(path) ? [path] : [];
  });
}

/** Every TypeScript file of the code folders. A folder that is missing or holds none stops the law: it never passes. */
export function codeFiles({ root, code }: Repository): string[] {
  if (code.length === 0) throw new Error(`${root}: no code folder named`);
  return code.flatMap(folder => {
    const path = join(root, folder);
    const files = existsSync(path) ? filesUnder(path, file => file.endsWith(".ts")) : [];
    if (files.length === 0) throw new Error(`${path}: no TypeScript file to check`);
    return files;
  });
}

export const isSpec = (path: string): boolean => path.endsWith(".spec.ts");
export const fromRoot = (root: string, path: string): string => relative(root, path).split(sep).join("/");
export const parsed = (path: string): ts.SourceFile =>
  ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);

/** Paths admitted by a law, each with the reason for that admission. A trailing slash names a folder. */
export type Exemptions = Readonly<Record<string, string>>;
export function staleExemptions(repo: Repository, exempt: Exemptions): string[] {
  return Object.entries(exempt).flatMap(([path, reason]) => {
    const file = join(repo.root, path);
    const present = existsSync(file) && (path.endsWith("/") ? statSync(file).isDirectory() : statSync(file).isFile());
    return present && reason.trim() ? [] : [path];
  });
}

/** The files linted by the repository gate, including test helpers and its runner configuration. */
export const lintFiles = (repo: Repository): string[] => [
  ...codeFiles(repo),
  ...filesUnder(join(repo.root, "tests"), path => path.endsWith(".ts")),
  join(repo.root, "vitest.config.ts"),
];
/** The size and escape checks additionally read the linter's configuration. */
export const checkedFiles = (repo: Repository): string[] => [...lintFiles(repo), join(repo.root, "eslint.config.js")];
