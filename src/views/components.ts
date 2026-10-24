import type { DeclaredViewBoundContent, DeclaredViewItem, DeclaredViewStack, DeclaredViewToolbar } from "./schema.ts";
import { declarationArray, declarationRecord } from "../modules/declaration-data.ts";
import { viewDock } from "./define-view.ts";
import { contentBuilder, createComponent, emptyComponent, requireComponent,
  type Exact, type ViewComponent } from "./component-values.ts";

type InputKind = DeclaredViewBoundContent["kind"];
type InputReference<Kind extends InputKind> = { readonly kind: Kind; readonly input: string };
type BoundProperties<Kind extends InputKind> = { readonly input: InputReference<Kind> }
  & (Kind extends "collection" ? Pick<Extract<DeclaredViewBoundContent, { kind: "collection" }>, "output" | "presentation" | "fields">
    : Kind extends "context" ? Pick<Extract<DeclaredViewBoundContent, { kind: "context" }>, "fields" | "presentation"> : object);

function boundComponent<Kind extends InputKind>(kind: Kind) {
  return <const Props extends BoundProperties<Kind>>(properties: Exact<Props, BoundProperties<Kind>>) => {
    const source = declarationRecord(properties);
    const port = declarationRecord(source.input);
    if (Object.keys(port).some(key => key !== "kind" && key !== "input") || port.kind !== kind) {
      throw new Error("INVALID_COMPONENT_INPUT");
    }
    return createComponent<Extract<DeclaredViewBoundContent, { kind: Kind }>>(kind, { ...source, input: port.input }) as unknown as
      ViewComponent<{ readonly kind: Kind; readonly id: string; readonly input: Props["input"]["input"] } & Omit<Props, "input">>;
  };
}

type StackProperties = Omit<DeclaredViewStack, "kind" | "id" | "items"> & { readonly items: readonly ViewComponent<DeclaredViewItem>[] };
function stack<const Props extends StackProperties>(properties: Exact<Props, StackProperties>) {
  const source = declarationRecord(properties);
  declarationArray(source.items).forEach(requireComponent);
  return createComponent<DeclaredViewStack>("stack", source) as ViewComponent<{ readonly kind: "stack"; readonly id: string } & Props>;
}
type ToolbarProperties = Omit<DeclaredViewToolbar, "kind">;
type ToolbarAction = DeclaredViewToolbar["actions"][number];
type ActionKeys<Action> = Action extends unknown ? keyof Action : never;
type ClosedActions<Actions extends readonly ToolbarAction[]> = {
  readonly [Index in keyof Actions]: Actions[Index] &
    Record<Exclude<ActionKeys<Actions[Index]>, keyof ToolbarAction>, never>;
};
function toolbar<const Props extends ToolbarProperties>(properties: Exact<Props, ToolbarProperties> & {
  readonly actions: ClosedActions<Props["actions"]>;
}) {
  return createComponent<DeclaredViewToolbar>("toolbar", properties) as ViewComponent<{ readonly kind: "toolbar" } & Props>;
}

export const ViewTitles = Object.freeze({
  product: Object.freeze({ kind: "product-title" as const }),
  subject: Object.freeze({ kind: "subject-title" as const }),
  operation: Object.freeze({ kind: "operation-label" as const }),
  greeting: Object.freeze({ kind: "greeting" as const }),
});

export const Components = Object.freeze({
  Header: contentBuilder("header"), Stack: stack,
  Text: contentBuilder("text"), Fact: contentBuilder("fact"),
  DestinationLink: contentBuilder("destination-link"),
  Tag: contentBuilder("tag"), Image: contentBuilder("image"), Avatar: contentBuilder("avatar"),
  Collection: boundComponent("collection"), Form: boundComponent("form"), Context: boundComponent("context"),
  MediaLibrary: contentBuilder("media-library"), VisualCatalog: emptyComponent("visual-catalog"),
  Appearance: emptyComponent("appearance"), SystemStatus: emptyComponent("system-status"),
  Identity: emptyComponent("identity"), Attention: emptyComponent("attention"),
  Navigation: emptyComponent("navigation"), Destination: emptyComponent("destination"),
  Toolbar: toolbar, Dock: viewDock,
});

export { defineView } from "./define-view.ts";
