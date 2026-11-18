import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, it } from "vitest";
import { lintConfiguration, lawRepository } from "../support/law-repository.ts";
import { longLines } from "../../src/checks/laws/size.ts";
import { root } from "../support/sources.ts";

it("keeps the generated lint config below 120 columns with a long checkout URL", () => {
  const repo = lawRepository({});
  const url = pathToFileURL(join(root, "a-long-folder/".repeat(30), "eslint.config.js")).href;
  writeFileSync(join(repo.root, "eslint.config.js"), lintConfiguration(url));
  expect(longLines(repo)).toEqual([]);
});
it("preserves the exact lint URL, including escapes, when loading the generated config", async () => {
  const repo = lawRepository({ 'lint " ñ.js': "export default { marker: 7 };" });
  const path = join(repo.root, "eslint.config.js");
  writeFileSync(path, lintConfiguration(pathToFileURL(join(repo.root, 'lint " ñ.js')).href));
  const loaded: unknown = await import(pathToFileURL(path).href);
  expect(loaded).toMatchObject({ default: { marker: 7 } });
});
