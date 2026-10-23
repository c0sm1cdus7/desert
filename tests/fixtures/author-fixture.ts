import { Components, defineView, type View, type ViewDeclaration } from "../../src/index.ts";
import type { ViewContent, ViewItem } from "../../src/views/schema.ts";
import type { ViewComponent } from "../../src/views/component-values.ts";
import { authoredViewData } from "../../src/views/authored-view.ts";

/** Re-author wire fixtures through the public catalog; this is not a production admission bypass. */
export function authorFixture<T>(source: T): T {
  const constructRuntimeView = defineView as (declaration: ViewDeclaration) => View;
  const copies = new Map<object, unknown>();
  function content(node: ViewContent): ViewComponent<ViewContent> {
    const { kind, ...properties } = node;
    Reflect.deleteProperty(properties, "id");
    Reflect.deleteProperty(properties, "version");
    switch (kind) {
      case "header": return Components.Header(properties as Omit<Extract<ViewContent, { kind: "header" }>, "id" | "kind">);
      case "stack": {
        const stack = node as Extract<ViewContent, { kind: "stack" }>;
        return Components.Stack({ title: stack.title, ...(stack.description ? { description: stack.description } : {}),
          items: stack.items.map(item => content(item) as ViewComponent<ViewItem>) });
      }
      case "collection": {
        const collection = node as Extract<ViewContent, { kind: "collection" }>;
        return Components.Collection({ input: { kind, input: collection.input }, output: collection.output });
      }
      case "form": case "context": {
        const bound = node as Extract<ViewContent, { kind: "form" | "context" }>;
        return kind === "form" ? Components.Form({ input: { kind, input: bound.input } })
          : Components.Context({ input: { kind, input: bound.input } });
      }
      case "text": return Components.Text(properties as Omit<Extract<ViewContent, { kind: "text" }>, "kind">);
      case "fact": return Components.Fact(properties as Omit<Extract<ViewContent, { kind: "fact" }>, "kind">);
      case "destination-link": return Components.DestinationLink(properties as Omit<Extract<ViewContent, { kind: "destination-link" }>, "id" | "kind">);
      case "tag": return Components.Tag(properties as Omit<Extract<ViewContent, { kind: "tag" }>, "kind" | "id" | "version">);
      case "image": return Components.Image(properties as Omit<Extract<ViewContent, { kind: "image" }>, "kind" | "id" | "version">);
      case "avatar": return Components.Avatar(properties as Omit<Extract<ViewContent, { kind: "avatar" }>, "kind" | "id" | "version">);
      case "media-library": return Components.MediaLibrary(properties as Omit<Extract<ViewContent, { kind: "media-library" }>, "id" | "kind">);
      case "visual-catalog": return Components.VisualCatalog();
      case "appearance": return Components.Appearance();
      case "system-status": return Components.SystemStatus();
      case "identity": return Components.Identity();
      case "attention": return Components.Attention();
      case "navigation": return Components.Navigation();
      case "destination": return Components.Destination();
    }
  }
  function clone(value: unknown): unknown {
    if (typeof value !== "object" || value === null) return value;
    if (copies.has(value)) return copies.get(value);
    if (Array.isArray(value)) {
      const result: unknown[] = [];
      copies.set(value, result);
      result.push(...value.map(clone));
      return result;
    }
    const data = value as Record<string, unknown>;
    if (data.version === "desert.view/1") {
      const view = value as View;
      authoredViewData(view);
      const result = constructRuntimeView({ name: view.id, ...(view.outputs ? { outputs: view.outputs } : {}),
        ...(view.topDock ? { topDock: Components.Toolbar({ actions: view.topDock.actions }) } : {}),
        ...(view.bottomDock ? { bottomDock: Components.Toolbar({ actions: view.bottomDock.actions }) } : {}),
        ...(view.leftDock ? { leftDock: Components.Dock(clone(view.leftDock.view) as View) } : {}),
        ...(view.rightDock ? { rightDock: Components.Dock(clone(view.rightDock.view) as View) } : {}),
        content: view.content.map(content) });
      copies.set(value, result);
      return result;
    }
    const result: Record<string, unknown> = {};
    copies.set(value, result);
    for (const [key, item] of Object.entries(data)) result[key] = clone(item);
    return result;
  }
  return clone(source) as T;
}
