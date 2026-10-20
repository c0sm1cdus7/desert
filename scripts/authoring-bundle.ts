import { copyFileSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { checkReferences, hash, sourceRoot } from "./authoring-references.ts";
import { skillRelease } from "./skill-release.ts";

const roots = ["src", "products", "tests", "skills", "scripts", "docs"];
const files = ["AGENTS.md", "AUTHORING.md", "README.md", "package.json", "package-lock.json", "tsconfig.json", "components.json", ".nvmrc", ".gitignore"];
const excluded = new Set(["node_modules", "artifacts"]);
export function bundleFiles(root: string) {
  const result = [...files];
  function walk(path: string) {
    for (const entry of readdirSync(join(root, path), { withFileTypes: true })) {
      if (entry.name.startsWith(".") || excluded.has(entry.name)) continue;
      const child = `${path}/${entry.name}`;
      if (entry.isSymbolicLink()) throw new Error(`SYMLINK_NOT_ALLOWED: ${child}`);
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile()) result.push(child);
      else throw new Error(`UNSUPPORTED_FILE: ${child}`);
    }
  }
  for (const path of roots) {
    if (lstatSync(join(root, path)).isSymbolicLink()) throw new Error(`SYMLINK_NOT_ALLOWED: ${path}`);
    walk(path);
  }
  return result.sort();
}

function fingerprint(root: string) {
  return Object.fromEntries(bundleFiles(root).map(path => {
    if (!lstatSync(join(root, path)).isFile()) throw new Error(`REGULAR_FILE_REQUIRED: ${path}`);
    return [path, hash(readFileSync(join(root, path)))];
  }));
}

export function packBundle(destination: string, root = sourceRoot) {
  checkReferences(root);
  const skillVersion = skillRelease(root);
  const content = fingerprint(root);
  mkdirSync(destination, { mode: 0o700 });
  for (const path of Object.keys(content)) {
    mkdirSync(dirname(join(destination, path)), { recursive: true });
    copyFileSync(join(root, path), join(destination, path));
  }
  const manifest = { format: "desert.authoring-bundle/1", skillVersion,
    sdkVersion: JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version,
    contentDigest: hash(JSON.stringify(content)), files: content };
  writeFileSync(join(destination, "AUTHORING-MANIFEST.json"), JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
  verifyBundle(destination);
  return manifest;
}

export function verifyBundle(root: string) {
  const manifest = JSON.parse(readFileSync(join(root, "AUTHORING-MANIFEST.json"), "utf8"));
  const actual = fingerprint(root);
  if (manifest.format !== "desert.authoring-bundle/1" || JSON.stringify(manifest.files) !== JSON.stringify(actual) ||
      manifest.contentDigest !== hash(JSON.stringify(actual)) ||
      manifest.skillVersion !== skillRelease(root) ||
      manifest.sdkVersion !== JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version) {
    throw new Error("AUTHORING_BUNDLE_MISMATCH");
  }
  checkReferences(root);
  return manifest.contentDigest as string;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  if (process.argv[2] === "--verify") console.log(verifyBundle(sourceRoot));
  else if (process.argv[2] === "--pack" && process.argv[3]) console.log(packBundle(resolve(process.argv[3])).contentDigest);
  else throw new Error("Use --verify or --pack NEW_DIRECTORY");
}
