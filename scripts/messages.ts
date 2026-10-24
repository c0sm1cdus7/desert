// A product's message keys (plan §14): node scripts/messages.ts --write | --check <product source folder>
//   --write   regenerate <folder>/messages/keys.ts from the <folder>/messages/<locale>.json bundles
//   --check   compare without writing, the comparison assertProductSource runs (MESSAGE_DERIVATION)
// The SDK's own catalog is written by `node scripts/catalog.ts --write`, not by this command.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { assertProductMessageKeys, productKeysModule, productMessageKeys } from "../src/authoring/messages.ts";
import { bundleLocale, messagesFolder } from "../src/messages/generate.ts";

const [command, folder, ...rest] = process.argv.slice(2);
if (!command || !["--write", "--check"].includes(command) || !folder || rest.length) {
  throw new Error("MESSAGES_USAGE: --write | --check <product source folder>");
}
const root = resolve(folder), bundles = new Map<string, string>();
for (const entry of (await readdir(join(root, messagesFolder))).sort()) {
  const locale = bundleLocale(entry);
  if (locale) bundles.set(locale, await readFile(join(root, messagesFolder, entry), "utf8"));
}
if (command === "--write") await writeFile(join(root, productKeysModule), productMessageKeys(bundles));
const keys = await readFile(join(root, productKeysModule), "utf8");
assertProductMessageKeys(bundles, keys);
console.log(`Message keys ${command === "--write" ? "generated and checked" : "checked"}: ${[...bundles.keys()].join(", ")} in ${productKeysModule}.`);
