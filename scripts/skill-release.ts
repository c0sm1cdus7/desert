import { readFileSync } from "node:fs";
import { join } from "node:path";

export function parseSkillRelease(skill: string, changelog: string) {
  const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  const versions = [...frontmatter.matchAll(/^  version: "([^"]+)"$/gm)];
  const version = versions[0]?.[1];
  if (versions.length !== 1 || !version || !/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(version)) {
    throw new Error("INVALID_SKILL_VERSION");
  }
  const latest = changelog.match(/^## (\S+) — (\d{4}-\d{2}-\d{2})$/m)?.[1];
  if (latest !== version) throw new Error("MISSING_CURRENT_SKILL_CHANGELOG");
  return version;
}

export function skillRelease(root: string) {
  return parseSkillRelease(
    readFileSync(join(root, "skills/desert/SKILL.md"), "utf8"),
    readFileSync(join(root, "skills/desert/CHANGELOG.md"), "utf8"),
  );
}
