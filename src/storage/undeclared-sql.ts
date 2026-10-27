// Law (plan §15, step 7.6; owner rule «no SQL files»): every database object is generated from a TypeScript declaration,
// never written by hand. Rule UNDECLARED_SQL refuses
//   - a `.sql` file anywhere but the generated folders (the DDL per installation digest, step 7.1, and the generated
//     migrations, step 7.3), and
//   - a string or template literal in code that names a DDL verb (CREATE, ALTER or DROP) anywhere but the generators
//     (src/storage/render-*.ts) and the storage tests (tests/storage-*.test.ts), which spell the generators' expected
//     output and this rule's own negative cases.
// A comment may mention a verb; only literals are SQL a program can run.
import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import ts from "typescript";

export type SqlViolation = Readonly<{ path: string; line: number; what: string }>;
export const generatedSqlFolders: readonly string[] = Object.freeze(["src/storage/generated/", "src/storage/migrations/"]);
const generator = /^src\/storage\/render-[a-z-]+\.ts$/;
const generatorTest = /^tests\/storage-[a-z-]+\.test\.ts$/;
const code = /\.(ts|mts|cts|js|mjs|cjs|svelte)$/;
const verb = /\b(CREATE|ALTER|DROP)\b/;
/** Folders that hold no authored source: dependencies, version control, worktrees and local output anywhere, and the
 * repository's build output (a `build` folder inside src/ is source). */
const skipped = new Set(["node_modules", ".git", ".claude", ".local", ".svelte-kit"]);
const skippedAtRoot = new Set(["build", "dist"]);

const scripts = (path: string, text: string): readonly Readonly<{ text: string; offset: number }>[] => path.endsWith(".svelte")
  ? [...text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match => ({ text: match[1] ?? "", offset: (match.index ?? 0) + match[0].indexOf(match[1] ?? "") }))
  : [{ text, offset: 0 }];

/** Every literal text of a source with its position: strings, plain templates, and each literal part of a template. */
function literals(path: string, text: string): readonly Readonly<{ text: string; position: number }>[] {
  const found: { text: string; position: number }[] = [];
  for (const script of scripts(path, text)) {
    const file = ts.createSourceFile(path, script.text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    const visit = (node: ts.Node): void => {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) found.push({ text: node.text, position: script.offset + node.getStart(file) });
      else if (ts.isTemplateExpression(node)) {
        found.push({ text: node.head.text, position: script.offset + node.head.getStart(file) });
        for (const span of node.templateSpans) found.push({ text: span.literal.text, position: script.offset + span.literal.getStart(file) });
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  return found;
}

/** The rule over a tree given as repository-relative paths (POSIX separators) and their text. */
export function undeclaredSql(files: ReadonlyMap<string, string>): readonly SqlViolation[] {
  const violations: SqlViolation[] = [];
  for (const [path, text] of files) {
    if (path.endsWith(".sql")) {
      if (!generatedSqlFolders.some(folder => path.startsWith(folder))) violations.push({ path, line: 1, what: "a .sql file outside the generated folders" });
      continue;
    }
    if (!code.test(path) || path.endsWith(".d.ts") || generator.test(path) || generatorTest.test(path)) continue;
    for (const literal of literals(path, text)) {
      const match = verb.exec(literal.text);
      if (match) violations.push({ path, line: text.slice(0, literal.position).split("\n").length, what: `a ${match[1]} string literal` });
    }
  }
  return violations;
}

/** The repository files the rule reads: every `.sql` file and every code file outside the skipped folders. */
export async function readSqlTree(root: string): Promise<ReadonlyMap<string, string>> {
  const files = new Map<string, string>();
  const walk = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!skipped.has(entry.name) && !(directory === root && skippedAtRoot.has(entry.name))) await walk(absolute);
        continue;
      }
      if (!entry.isFile() || !(entry.name.endsWith(".sql") || code.test(entry.name))) continue;
      files.set(relative(root, absolute).split(sep).join("/"), await readFile(absolute, "utf8"));
    }
  };
  await walk(root);
  return files;
}

export const formatSqlViolation = (violation: SqlViolation) =>
  `UNDECLARED_SQL: ${violation.path}:${violation.line}: ${violation.what}; declare the table in TypeScript and generate it (src/storage/undeclared-sql.ts)`;
