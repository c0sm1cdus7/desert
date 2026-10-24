import type { AuthoredView, AuthoredViewRef, ViewTarget } from "../modules/authored-types.ts";
import { declarationArray, declarationRecord } from "../modules/declaration-data.ts";
import { authoredView, viewTargetDefinition } from "./authored-view.ts";
import { ViewVersion, type DeclaredViewContent, type DeclaredViewToolbar } from "./schema.ts";
import { placeComponent, requireComponent, type ComponentNode, type Exact, type ViewComponent } from "./component-values.ts";
import { registerDefinedView } from "./defined-view-registry.ts";

declare const dock: unique symbol;
export type ViewDock<Target extends ViewTarget = ViewTarget> = Omit<AuthoredViewRef, "view"> & {
  readonly view: Target; readonly [dock]: true;
};
const docks = new WeakSet<object>();

export function viewDock<const Target extends ViewTarget>(target: Target): ViewDock<Target> {
  viewTargetDefinition(target);
  const result = Object.freeze({ kind: "view" as const, view: target });
  docks.add(result);
  return result as ViewDock<Target>;
}

export type ViewDeclaration = {
  readonly name: string;
  readonly layout?: "overview" | "gallery";
  readonly outputs?: readonly string[];
  readonly topDock?: ViewComponent<DeclaredViewToolbar>;
  readonly bottomDock?: ViewComponent<DeclaredViewToolbar>;
  readonly leftDock?: ViewDock;
  readonly rightDock?: ViewDock;
  readonly content: readonly ViewComponent<DeclaredViewContent>[];
};
type DefinedContent<Content extends readonly ViewComponent<DeclaredViewContent>[]> = {
  readonly [Index in keyof Content]: ComponentNode<Content[Index]>;
};
type DefinedView<Definition extends ViewDeclaration> = Omit<Definition, "name" | "content"> & {
  readonly version: typeof ViewVersion;
  readonly id: Definition["name"];
  readonly content: DefinedContent<Definition["content"]>;
};
type ComponentOutputs<Component> =
  Component extends { readonly kind: "toolbar"; readonly actions: readonly { readonly output: infer Output extends string }[] } ? Output :
  Component extends { readonly kind: "collection" | "destination-link"; readonly output: infer Output extends string } ? Output :
  Component extends { readonly kind: "stack"; readonly items: readonly (infer Item)[] } ? ComponentOutputs<Item> : never;
type ReferencedOutputs<Definition extends ViewDeclaration> = ComponentOutputs<Definition["content"][number]>
  | ComponentOutputs<Definition["topDock"]> | ComponentOutputs<Definition["bottomDock"]>;
type DeclaredOutputs<Definition> = Definition extends { readonly outputs: readonly (infer Output extends string)[] } ? Output : never;
type UnboundOutputs<Definition extends ViewDeclaration> = Definition extends unknown ?
  [ReferencedOutputs<Definition>] extends [never] ? never :
  string extends DeclaredOutputs<Definition> ? string :
  Exclude<ReferencedOutputs<Definition>, DeclaredOutputs<Definition>> : never;
type BoundOutputs<Definition extends ViewDeclaration> = [UnboundOutputs<Definition>] extends [never] ? unknown : never;

export function defineView<const Definition extends ViewDeclaration>(
  definition: Exact<Definition, ViewDeclaration> & NoInfer<BoundOutputs<Definition>>,
): DefinedView<Definition> {
  const source = declarationRecord(definition);
  const allowed = new Set(["name", "layout", "outputs", "content", "topDock", "bottomDock", "leftDock", "rightDock"]);
  if (Object.keys(source).some(key => !allowed.has(key))) throw new Error("INVALID_VIEW_DECLARATION");
  for (const key of ["topDock", "bottomDock"]) {
    if (Object.hasOwn(source, key)) requireComponent(source[key]);
  }
  for (const key of ["leftDock", "rightDock"]) {
    if (Object.hasOwn(source, key) && !docks.has(source[key] as object)) throw new Error("UNREGISTERED_VIEW_DOCK");
  }
  const { name, content, ...rest } = source;
  const canonical = { ...rest, version: ViewVersion, id: name,
    content: declarationArray(content).map((item, index) => placeComponent(item as ViewComponent<DeclaredViewContent>, `content.${index}`)) };
  const result = authoredView(canonical as AuthoredView);
  registerDefinedView(result);
  return result as unknown as DefinedView<Definition>;
}
