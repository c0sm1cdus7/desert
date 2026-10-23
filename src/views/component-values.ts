import { Check } from "@sinclair/typebox/value";
import type { TSchema } from "@sinclair/typebox";
import { freezeDeep } from "../json.ts";
import { declarationRecord } from "../modules/declaration-data.ts";
import { viewSnapshot } from "./snapshot.ts";
import { ViewContentSchema, ViewToolbarSchema, type ViewContent, type ViewToolbar } from "./schema.ts";

declare const component: unique symbol;
export type ViewComponent<Node> = Readonly<Node> & { readonly [component]: true };
export type ComponentNode<C> = C extends ViewComponent<infer Node> ? Node : never;
export type Exact<Props, Allowed> = Props & Record<Exclude<keyof Props, keyof Allowed>, never>;
export type ContentKind = ViewContent["kind"];
export type ContentNode<Kind extends ContentKind> = Extract<ViewContent, { readonly kind: Kind }>;
export type ContentProperties<Kind extends ContentKind> = Omit<ContentNode<Kind>, "kind" | "id" | "version">;

const components = new WeakSet<object>();
const schemas = new Map<string, TSchema>(ViewContentSchema.anyOf.map(schema => [schema.properties.kind.const, schema]));
schemas.set("toolbar", ViewToolbarSchema);

export function componentProperties(value: unknown) {
  try {
    const properties = declarationRecord(value);
    if (["id", "kind", "version"].some(key => Object.hasOwn(properties, key))) throw new Error("OWNED_COMPONENT_PROPERTY");
    return declarationRecord(viewSnapshot(properties));
  } catch (cause) { throw new Error("INVALID_COMPONENT_PROPERTIES", { cause }); }
}

export function createComponent<Node extends ViewContent | ViewToolbar>(kind: ViewContent["kind"] | "toolbar", properties: unknown): ViewComponent<Node> {
  const schema = schemas.get(kind);
  if (!schema) throw new Error("UNINSTALLED_VIEW_COMPONENT");
  const props = componentProperties(properties);
  const value = { kind, ...("id" in schema.properties ? { id: "unplaced" } : {}),
    ...("version" in schema.properties ? { version: schema.properties.version.const } : {}), ...props };
  if (!Check(schema, value)) throw new Error("INVALID_COMPONENT_PROPERTIES");
  const result = freezeDeep(value);
  components.add(result);
  return result as unknown as ViewComponent<Node>;
}

export function contentBuilder<Kind extends ContentKind>(kind: Kind) {
  return <const Props extends ContentProperties<Kind>>(properties: Exact<Props, ContentProperties<Kind>>) =>
    createComponent<ContentNode<Kind>>(kind, properties) as unknown as
      ViewComponent<Props & Omit<ContentNode<Kind>, keyof ContentProperties<Kind>>>;
}

export function emptyComponent<Kind extends ContentKind>(kind: Kind) {
  return (...args: readonly []) => {
    if (args.length) throw new Error("INVALID_COMPONENT_PROPERTIES");
    return createComponent<ContentNode<Kind>>(kind, {});
  };
}

export function requireComponent(value: unknown) {
  if (typeof value !== "object" || value === null || !components.has(value)) {
    throw new Error("UNREGISTERED_VIEW_COMPONENT");
  }
}

export function placeComponent(value: ViewComponent<ViewContent>, path: string): ViewContent {
  requireComponent(value);
  if (value.kind === "stack") return { ...value, id: path,
    items: value.items.map((item, index) => "id" in item ? { ...item, id: `${path}.items.${index}` } : item) };
  return "id" in value ? { ...value, id: path } : value;
}
