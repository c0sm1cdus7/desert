import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { bundleFiles } from "../../scripts/authoring-bundle.ts";
import { sourceRoot } from "../../scripts/authoring-references.ts";
import type { NotebookEvidence } from "./report.ts";

const hash = (source: string | Buffer) => createHash("sha256").update(source).digest("hex");
export function revisionDigest(files: Record<string, string>, runner: NotebookEvidence["runner"]) {
  return hash(JSON.stringify({ files: Object.entries(files).sort(([a], [b]) => a.localeCompare(b)), runner }));
}

export function captureNotebookRevision() {
  const bin = process.env.DESERT_PG_BIN ?? execFileSync("pg_config", ["--bindir"], { encoding: "utf8" }).trim();
  const runner = { node: process.version, platform: process.platform, arch: process.arch,
    postgres: execFileSync(join(bin, "postgres"), ["--version"], { encoding: "utf8" }).trim() };
  const paths = bundleFiles(sourceRoot).filter(path => /^(src|products|tests|scripts|apps)\//.test(path)
    || ["package.json", "package-lock.json", "tsconfig.json", ".nvmrc"].includes(path));
  const files = Object.fromEntries(paths.map(path => [path, hash(readFileSync(join(sourceRoot, path)))]));
  return { revision: revisionDigest(files, runner), runner, files };
}
