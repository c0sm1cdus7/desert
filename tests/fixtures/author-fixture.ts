import { Components, defineView, type View, type ViewDeclaration } from "../../src/index.ts";
import type { DeclaredViewContent, DeclaredViewItem, View as WireView } from "../../src/views/schema.ts";
import type { ViewComponent } from "../../src/views/component-values.ts";
import { authoredViewData } from "../../src/views/authored-view.ts";
import type { Declared } from "../../src/views/declared.ts";
import { domainFields, messageFields } from "../../src/views/declared.ts";
import { declaredFixture, fixtureMessage } from "./messages.ts";

const fields: ReadonlySet<string> = new Set(messageFields), domains: ReadonlySet<string> = new Set(domainFields);

/** Re-author wire fixtures through the public catalog; this is not a production admission bypass. Every sentence in a
 * message field becomes its fixture message (plan §14), so the composed product resolves back to the same wire text. */
export function authorFixture<const T>(source: T): Declared<T> {
  const constructRuntimeView = defineView as (declaration: ViewDeclaration) => View;
  const copies = new Map<object, unknown>();
  function content(node: DeclaredViewContent): ViewComponent<DeclaredViewContent> {
    const { kind, ...properties } = node;
    Reflect.deleteProperty(properties, "id");
    Reflect.deleteProperty(properties, "version");
    switch (kind) {
      case "header": return Components.Header(properties as Omit<Extract<DeclaredViewContent, { kind: "header" }>, "id" | "kind">);
      case "stack": {
        const stack = node as Extract<DeclaredViewContent, { kind: "stack" }>;
        return Components.Stack({ title: stack.title, ...(stack.description ? { description: stack.description } : {}),
          items: stack.items.map(item => content(item) as ViewComponent<DeclaredViewItem>) });
      }
      case "collection": {
        const collection = node as Extract<DeclaredViewContent, { kind: "collection" }>;
        return Components.Collection({ input: { kind, input: collection.input }, output: collection.output });
      }
      case "form": case "context": {
        const bound = node as Extract<DeclaredViewContent, { kind: "form" | "context" }>;
        return kind === "form" ? Components.Form({ input: { kind, input: bound.input } })
          : Components.Context({ input: { kind, input: bound.input } });
      }
      case "text": return Components.Text(properties as Omit<Extract<DeclaredViewContent, { kind: "text" }>, "kind">);
      case "fact": return Components.Fact(properties as Omit<Extract<DeclaredViewContent, { kind: "fact" }>, "kind">);
      case "destination-link": return Components.DestinationLink(properties as Omit<Extract<DeclaredViewContent, { kind: "destination-link" }>, "id" | "kind">);
      case "tag": return Components.Tag(properties as Omit<Extract<DeclaredViewContent, { kind: "tag" }>, "kind" | "id" | "version">);
      case "image": return Components.Image(properties as Omit<Extract<DeclaredViewContent, { kind: "image" }>, "kind" | "id" | "version">);
      case "avatar": return Components.Avatar(properties as Omit<Extract<DeclaredViewContent, { kind: "avatar" }>, "kind" | "id" | "version">);
      case "media-library": return Components.MediaLibrary(properties as Omit<Extract<DeclaredViewContent, { kind: "media-library" }>, "id" | "kind">);
      case "visual-catalog": return Components.VisualCatalog();
      case "appearance": return Components.Appearance();
      case "system-status": return Components.SystemStatus();
      case "identity": return Components.Identity();
      case "attention": return Components.Attention();
      case "navigation": return Components.Navigation();
      case "destination": return Components.Destination();
    }
  }
  // `domain`: inside a fact, journey or command definition, which names facts and never holds a sentence.
  function clone(value: unknown, domain = false): unknown {
    if (typeof value !== "object" || value === null) return value;
    if (copies.has(value)) return copies.get(value);
    if (Array.isArray(value)) {
      const result: unknown[] = [];
      copies.set(value, result);
      result.push(...value.map(item => clone(item, domain)));
      return result;
    }
    const data = value as Record<string, unknown>;
    if (data.version === "desert.view/1") {
      const wire = value as WireView, view = declaredFixture(wire);
      authoredViewData({ ...view, ...(wire.leftDock ? { leftDock: { kind: "view", view: clone(wire.leftDock.view) as View } } : {}),
        ...(wire.rightDock ? { rightDock: { kind: "view", view: clone(wire.rightDock.view) as View } } : {}) } as View);
      const result = constructRuntimeView({ name: view.id, ...(view.outputs ? { outputs: view.outputs } : {}),
        ...(view.topDock ? { topDock: Components.Toolbar({ actions: view.topDock.actions }) } : {}),
        ...(view.bottomDock ? { bottomDock: Components.Toolbar({ actions: view.bottomDock.actions }) } : {}),
        ...(wire.leftDock ? { leftDock: Components.Dock(clone(wire.leftDock.view) as View) } : {}),
        ...(wire.rightDock ? { rightDock: Components.Dock(clone(wire.rightDock.view) as View) } : {}),
        content: view.content.map(content) });
      copies.set(value, result);
      return result;
    }
    const result: Record<string, unknown> = {};
    copies.set(value, result);
    for (const [key, item] of Object.entries(data)) {
      result[key] = !domain && typeof item === "string" && fields.has(key) ? fixtureMessage(item) : clone(item, domain || domains.has(key));
    }
    return result;
  }
  return clone(source) as Declared<T>;
}
