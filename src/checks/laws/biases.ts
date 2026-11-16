// Law 20: prose lives in the declared catalog; each technical exception stays accounted for.
import { join } from "node:path";
import { codeFiles, fromRoot, isSpec, parsed, staleExemptions, type Repository, type Exemptions } from "./law-files.ts";
import { proseOf } from "./law-words.ts";
export type WordOptions = Readonly<{ catalog: readonly string[]; exempt: Exemptions }>;

export function staleWordExemptions(repo: Repository, options: WordOptions): string[] {
  codeFiles(repo);
  const stale = staleExemptions(repo, options.exempt);
  return [
    ...stale,
    ...Object.keys(options.exempt).filter(
      path => !stale.includes(path) && proseOf(parsed(join(repo.root, path))).length === 0,
    ),
  ];
}

export function uncataloguedWords(repo: Repository, options: WordOptions): string[] {
  const files = codeFiles(repo).filter(file => !isSpec(file));
  const writing = files.filter(
    file =>
      !options.catalog.some(path =>
        path.endsWith("/") ? fromRoot(repo.root, file).startsWith(path) : fromRoot(repo.root, file) === path,
      ) && !(fromRoot(repo.root, file) in options.exempt),
  );
  return [
    ...staleWordExemptions(repo, options),
    ...writing.flatMap(file => proseOf(parsed(file)).map(text => `${fromRoot(repo.root, file)}: ${text}`)),
  ];
}
