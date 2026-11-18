// Checks standalone program imports against DESERT, owned code and explicitly requested contract modules.
import { distributionTexts } from "../../texts/distributions.texts.ts";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import ts from "typescript";
import { field, isRecord } from "../../fields/json-values.ts";
import { codeFiles, fromRoot, isSpec, parsed, type Repository } from "./law-files.ts";
import { importsIn } from "./imports.ts";

// Public package visibility does not grant a program the host's composition or custody authority.
const programEntries = new Set([
  "desert/programa",
  "desert/messages",
  "desert/fields",
  "desert/journal",
  "desert/program-types",
  "desert/surface",
  "desert/testing",
]);
export type ProgramDependency = Readonly<{ kind: "contract" | "distribution"; name: string }>;
export function programDependencies(value: unknown): readonly ProgramDependency[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("desert.dependencies: invalid declaration");
  return value.map((entry: unknown) => {
    if (
      !isRecord(entry) ||
      !["contract", "distribution"].includes(String(entry.kind)) ||
      typeof entry.name !== "string" ||
      !entry.name ||
      entry.name.startsWith(".") ||
      entry.name.startsWith("/")
    )
      throw new Error("desert.dependencies: invalid dependency");
    return { kind: entry.kind === "contract" ? "contract" : "distribution", name: entry.name };
  });
}
function distributionPackage(file: string): boolean {
  let folder = dirname(file);
  while (dirname(folder) !== folder) {
    const manifest = join(folder, "package.json");
    if (existsSync(manifest)) {
      const pkg: unknown = JSON.parse(readFileSync(manifest, "utf8"));
      return field(field(pkg, "desert"), "kind") === "distribution";
    }
    folder = dirname(folder);
  }
  return false;
}
export function programImports(repo: Repository): string[] {
  const pkg: unknown = JSON.parse(readFileSync(join(repo.root, "package.json"), "utf8"));
  const desert = field(pkg, "desert");
  if (field(desert, "program") === undefined || field(desert, "kind") === "distribution") return [];
  const dependencies = programDependencies(field(desert, "dependencies"));
  const files = codeFiles(repo).filter(file => !isSpec(file));
  const own = new Set(files.map(file => realpathSync(file)));

  return [
    ...(typeof field(desert, "testDistribution") === "string" && field(desert, "testDistribution") !== ""
      ? []
      : [distributionTexts.testDistributionRequired]),
    ...dependencies.filter(d => d.kind === "distribution").map(d => distributionTexts.dependencyImport(d.name)),
    ...files.flatMap(file =>
      importsIn(parsed(file))
        .filter(specifier => !allowedImport(repo, own, dependencies, file, specifier))
        .map(specifier => `${fromRoot(repo.root, file)} → ${specifier}`),
    ),
  ];
}

function allowedImport(
  repo: Repository,
  own: ReadonlySet<string>,
  dependencies: readonly ProgramDependency[],
  file: string,
  specifier: string,
): boolean {
  if (specifier.startsWith("desert/"))
    return programEntries.has(specifier) || /^desert\/fields\/[a-z][a-z0-9-]*$/u.test(specifier);
  if (specifier.startsWith(".")) {
    const target = resolve(dirname(file), specifier);
    return (
      existsSync(target) &&
      own.has(realpathSync(target)) &&
      repo.code.some(folder => realpathSync(target).startsWith(`${resolve(realpathSync(repo.root), folder)}${sep}`)) &&
      !distributionPackage(target)
    );
  }
  if (!dependencies.some(dependency => dependency.kind === "contract" && dependency.name === specifier)) return false;
  const resolved = ts.resolveModuleName(
    specifier,
    file,
    {
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      allowJs: true,
    },
    ts.sys,
  ).resolvedModule?.resolvedFileName;
  return resolved !== undefined && !distributionPackage(realpathSync(resolved));
}
