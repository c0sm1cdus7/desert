// The message generator: `keys.ts` is a projection of the `<locale>.json` bundles of one catalog folder (plan §14, L1).
// A pure function of its input. The SDK writes its own through `node scripts/catalog.ts --write` (rule C compares); a product's
// is written by its messages command and compared by assertProductSource. Raises MESSAGE_CATALOG for a malformed bundle.
import { flattenMessages } from "./catalog.ts";

/** The folder every catalog keeps: `<locale>.json` bundles and the generated `keys.ts`, nothing else. */
export const messagesFolder = "messages";
export const messageKeysFile = "keys.ts";
const bundleFile = /^([a-z]{2,3}(?:-[A-Z]{2})?)\.json$/;

/** The locale a bundle file holds, or undefined when the name is not `<locale>.json`. */
export const bundleLocale = (file: string): string | undefined => bundleFile.exec(file)?.[1];

function parseBundle(locale: string, source: string): unknown {
  try { return JSON.parse(source); } catch { throw new Error(`MESSAGE_CATALOG: ${locale}.json is not JSON`); }
}

/** `keys.ts` for these bundles. `catalogModule` is the import specifier of the SDK's messageCatalog from that file. */
export function generateMessageKeys(bundles: ReadonlyMap<string, string>, input: Readonly<{ catalogModule: string; command: string }>): string {
  const locales = [...bundles.keys()].sort();
  if (!locales.length) throw new Error("MESSAGE_CATALOG: a message catalog needs at least one <locale>.json bundle");
  const trees = locales.map(locale => {
    const tree = parseBundle(locale, bundles.get(locale) ?? "");
    flattenMessages(locale, tree);
    return `  ${JSON.stringify(locale)}: ${JSON.stringify(tree, null, 2).replaceAll("\n", "\n  ")},`;
  });
  return [
    `// Generated from ${locales.map(locale => `${locale}.json`).join(", ")} by \`${input.command}\`; do not edit.`,
    `import { messageCatalog } from ${JSON.stringify(input.catalogModule)};`, "",
    "export const Messages = messageCatalog({", ...trees, "} as const);",
    "/** The accessor declarations use: `m.notes.title` is the message `{ key: \"notes.title\" }`. */",
    "export const m = Messages.m;",
    "export const MessageKeySchema = Messages.keySchema;",
    "export type MessageKey = typeof Messages.keys[number];", ""].join("\n");
}
