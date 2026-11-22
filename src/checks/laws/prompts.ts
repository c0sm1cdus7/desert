// Law 15: instructions live only in marked translations of skills and house or mind layers.
import { join } from "node:path";
import {
  codeFiles,
  parsed,
  filesUnder,
  fromRoot,
  isSpec,
  staleExemptions,
  type Repository,
  type Exemptions,
} from "./law-files.ts";
import { instructionTranslations } from "./message-declarations.ts";
import { stringsOf, stringsIn, isNormative } from "./law-words.ts";
export type RuleExemptions = Readonly<Record<string, Readonly<{ reason: string; texts: readonly string[] }>>>;
export type PromptOptions = Readonly<{ exempt: RuleExemptions }>;

export function hiddenRules(repo: Repository, options: PromptOptions): string[] {
  const files = codeFiles(repo).filter(file => !isSpec(file));
  const reasons = Object.fromEntries(Object.entries(options.exempt).map(([path, entry]) => [path, entry.reason]));
  const stale = staleExemptions(repo, reasons);
  const unused = Object.entries(options.exempt).filter(
    ([path, entry]) =>
      !stale.includes(path) &&
      (!entry.texts.length ||
        entry.texts.some(text => !isNormative(text) || !stringsOf(join(repo.root, path)).includes(text))),
  );
  return [
    ...stale,
    ...unused.map(([path]) => path),
    ...files.flatMap(file => {
      const source = parsed(file);
      return stringsIn(source, instructionTranslations(source))
        .filter(text => isNormative(text) && !options.exempt[fromRoot(repo.root, file)]?.texts.includes(text))
        .map(text => `${fromRoot(repo.root, file)}: ${text}`);
    }),
  ];
}

export function instructionFiles(repo: Repository, options: Readonly<{ data: Exemptions }>): string[] {
  codeFiles(repo);
  const others = repo.code.flatMap(folder => filesUnder(join(repo.root, folder), path => !path.endsWith(".ts")));
  return [
    ...staleExemptions(repo, options.data),
    ...others.map(file => fromRoot(repo.root, file)).filter(file => !(file in options.data)),
  ];
}
