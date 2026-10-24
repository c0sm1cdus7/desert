// Law (plan §14): a human-visible sentence is written once, in its owner's message catalog; declarations name it by key.
// Raises MESSAGE_CATALOG (a malformed bundle), MESSAGE_MISSING (a key absent from the selected locale) and MESSAGE_PARAMETERS.
import { Type, type TLiteral, type TUnion } from "@sinclair/typebox";
import { MessageKeyPattern, type Message } from "../views/definition.ts";

/** One locale's bundle as written in `<locale>.json`: nested segments whose leaves are sentences. */
export type MessageTree = { readonly [segment: string]: string | MessageTree };
type Keys<Tree, Prefix extends string = ""> = { [Segment in keyof Tree & string]:
  Tree[Segment] extends string ? `${Prefix}${Segment}` : Keys<Tree[Segment], `${Prefix}${Segment}.`> }[keyof Tree & string];
export type MessageAccessor<Tree, Prefix extends string = ""> = { readonly [Segment in keyof Tree & string]:
  Tree[Segment] extends string ? Message<`${Prefix}${Segment}`> : MessageAccessor<Tree[Segment], `${Prefix}${Segment}.`> };
export type MessageParameters = Readonly<Record<string, string>>;
/** What a build reads from a catalog: the sentence of each key in one locale. */
export type MessageBundle = Readonly<{ locale: string; text: (message: Message, parameters?: MessageParameters) => string }>;

const localePattern = /^[a-z]{2,3}(?:-[A-Z]{2})?$/;
const segmentPattern = /^[A-Za-z][A-Za-z0-9_]*$/;
const keyPattern = new RegExp(MessageKeyPattern);
const placeholder = /\{([A-Za-z][A-Za-z0-9]*)\}/g;
const catalogs = new WeakSet<object>();
const fail = (code: string, what: string): never => { throw new Error(`${code}: ${what}`); };

/** Every `key → sentence` of one locale's tree, in the tree's order; a malformed tree is MESSAGE_CATALOG. */
export function flattenMessages(locale: string, tree: unknown, prefix = ""): ReadonlyMap<string, string> {
  if (typeof tree !== "object" || tree === null || Array.isArray(tree)) return fail("MESSAGE_CATALOG", `${locale}: ${prefix || "the bundle"} is not an object of segments`);
  const flat = new Map<string, string>();
  for (const [segment, value] of Object.entries(tree)) {
    const key = `${prefix}${segment}`;
    if (!segmentPattern.test(segment)) fail("MESSAGE_CATALOG", `${locale}: ${key} is not a message segment`);
    if (typeof value !== "string") { for (const [child, sentence] of flattenMessages(locale, value, `${key}.`)) flat.set(child, sentence); continue; }
    if (!keyPattern.test(key)) fail("MESSAGE_CATALOG", `${locale}: ${key} needs an owner segment and a meaning segment`);
    if (!/\S/.test(value)) fail("MESSAGE_CATALOG", `${locale}: ${key} is an empty sentence`);
    flat.set(key, value);
  }
  return flat;
}

function substitute(locale: string, key: string, sentence: string, parameters: MessageParameters): string {
  const named = new Set([...sentence.matchAll(placeholder)].map(match => match[1] ?? ""));
  const given = Object.keys(parameters);
  if (given.length !== named.size || given.some(name => !named.has(name))) {
    fail("MESSAGE_PARAMETERS", `${key} in ${locale} takes {${[...named].join("}, {")}}; given ${given.join(", ") || "none"}`);
  }
  return sentence.replace(placeholder, (_, name: string) => parameters[name] ?? "");
}

type AccessorNode = { [segment: string]: AccessorNode | Message };
const isMessage = (node: AccessorNode | Message): node is Message => typeof node.key === "string" && Object.keys(node).length === 1;

/** The frozen tree of messages, one leaf per key; a key that is also another key's segment (two locales disagree) is refused. */
function accessorOf(keys: readonly string[]): AccessorNode {
  const root: AccessorNode = {};
  for (const key of keys) {
    const segments = key.split("."), leaf = segments.pop() ?? "";
    let node = root;
    for (const segment of segments) {
      const next = node[segment] ??= {};
      if (isMessage(next)) return fail("MESSAGE_CATALOG", `${key} extends the key ${next.key}`);
      node = next;
    }
    if (node[leaf]) fail("MESSAGE_CATALOG", `${key} is a key and a segment of another key`);
    node[leaf] = Object.freeze({ key });
  }
  const freeze = (node: AccessorNode): AccessorNode => {
    for (const child of Object.values(node)) if (!isMessage(child)) freeze(child);
    return Object.freeze(node);
  };
  return freeze(root);
}

/** A product's or the SDK's catalog from its bundles (the generated `keys.ts` is the only caller in source). */
export function messageCatalog<const Bundles extends Readonly<Record<string, MessageTree>>>(bundles: Bundles) {
  const locales = new Map<string, ReadonlyMap<string, string>>();
  for (const [locale, tree] of Object.entries(bundles)) {
    if (!localePattern.test(locale)) fail("MESSAGE_CATALOG", `${locale} is not a locale`);
    locales.set(locale, flattenMessages(locale, tree));
  }
  const keys = [...new Set([...locales.values()].flatMap(flat => [...flat.keys()]))].sort();
  const accessor = accessorOf(keys);
  type Key = Keys<Bundles[keyof Bundles]>;
  const keySchema = Type.Union(keys.map(key => Type.Literal(key))) as unknown as TUnion<TLiteral<Key>[]>;
  const bundle = (locale: string): MessageBundle => {
    const flat = locales.get(locale) ?? fail("MESSAGE_MISSING", `no ${locale} bundle; the catalog has ${[...locales.keys()].join(", ") || "none"}`);
    return Object.freeze({ locale, text: (message: Message, parameters: MessageParameters = {}) => {
      const sentence = flat.get(message.key) ?? fail("MESSAGE_MISSING", `${message.key} is not in the ${locale} bundle`);
      return substitute(locale, message.key, sentence, parameters);
    } });
  };
  // `bundles`: the trees as given, so a test witness can extend a product's catalog without restating its sentences.
  const catalog = Object.freeze({ m: accessor as MessageAccessor<Bundles[keyof Bundles]>, keys: Object.freeze(keys) as readonly Key[],
    keySchema, locales: Object.freeze([...locales.keys()]), bundle, bundles });
  catalogs.add(catalog);
  return catalog;
}
/** What a consumer of any catalog reads: its locales and the bundle of one (the composition root resolves through it). */
export type MessageCatalog = Readonly<{ locales: readonly string[]; bundle: (locale: string) => MessageBundle }>;

/** A catalog made by messageCatalog, never a look-alike object (the composition root receives only real catalogs). */
export function requireMessageCatalog(value: unknown): MessageCatalog {
  if (typeof value !== "object" || value === null || !catalogs.has(value)) return fail("MESSAGE_CATALOG", "messages is not a catalog from a generated keys.ts");
  return value as MessageCatalog;
}
