import { Components, ViewTitles, defineView, viewOutput, viewPorts, type Message, type View, type ViewDeclaration } from "../../src/index.ts";
import { fixtureText } from "./messages.ts";

const ports = viewPorts({ inputs: { records: "collection", draft: "form", subject: "context" }, outputs: ["select", "save"] });
const header = Components.Header({ title: fixtureText.notes, subtitle: fixtureText.yourNotes });
const paragraph = Components.Text({ text: "A paragraph." });
const notes = defineView({ name: "notes", outputs: ports.outputs,
  topDock: Components.Toolbar({ actions: [{ output: ports.output.save, label: fixtureText.save, icon: "save" }] }),
  content: [header, paragraph, Components.Stack({ title: fixtureText.allNotes, items: [
    Components.Collection({ input: ports.inputs.records, output: ports.output.select }),
  ] })],
});
const view: View = notes;
const exactOutput: "save" = notes.topDock.actions[0].output;
const exactTitle: Message<"fixture.notes"> = notes.content[0].title;
const exactName: "notes" = notes.id;
viewOutput(notes, "save");
const detail = defineView({ name: "detail", content: [Components.Header({ title: ViewTitles.subject }),
  Components.Context({ input: ports.inputs.subject })] });
const workspace = defineView({ name: "workspace", leftDock: Components.Dock(detail), content: [Components.Destination()] });
const exactReference: typeof detail = workspace.leftDock.view;
const saveToolbar = Components.Toolbar({ actions: [{ output: ports.output.save, label: fixtureText.save, icon: "save" }] });
// @ts-expect-error A referenced toolbar output must be declared by this View.
defineView({ name: "bad", outputs: ["select"], topDock: saveToolbar, content: [] });
const wrongOutputs = { name: "bad", outputs: ["select"], topDock: saveToolbar, content: [] } as const;
// @ts-expect-error A variable cannot evade output membership.
defineView(wrongOutputs);
// @ts-expect-error Referenced outputs cannot be omitted.
defineView({ name: "bad", topDock: saveToolbar, content: [] });
// @ts-expect-error Bottom toolbar uses the same output membership rule.
defineView({ name: "bad", outputs: ["select"], bottomDock: saveToolbar, content: [] });
// @ts-expect-error Collection outputs must also be declared.
defineView({ name: "bad", outputs: ["save"], content: [Components.Collection({ input: ports.inputs.records, output: ports.output.select })] });
// @ts-expect-error Stack items use the same membership rule.
defineView({ name: "bad", outputs: ["save"], content: [Components.Stack({ title: fixtureText.notes, items: [Components.Collection({ input: ports.inputs.records, output: ports.output.select })] })] });
const widenedOutputs: readonly string[] = ["select"];
// @ts-expect-error Broad string arrays cannot hide invalid references.
defineView({ name: "bad", outputs: widenedOutputs, topDock: saveToolbar, content: [] });
const widenedView: ViewDeclaration = { name: "bad", outputs: ["select"], topDock: saveToolbar, content: [] };
// @ts-expect-error Explicit broad generics cannot silently bypass membership.
defineView<ViewDeclaration>(widenedView);
declare const outputVariant:
  | { readonly name: "first"; readonly outputs: readonly ["save"]; readonly topDock: typeof saveToolbar; readonly content: readonly [] }
  | { readonly name: "second"; readonly outputs: readonly ["select"]; readonly topDock: typeof saveToolbar; readonly content: readonly [] };
// @ts-expect-error Union variants cannot borrow another variant's declared outputs.
defineView(outputVariant);
declare const validOutputVariant:
  | { readonly name: "first"; readonly outputs: readonly ["save"]; readonly topDock: typeof saveToolbar; readonly content: readonly [] }
  | { readonly name: "second"; readonly content: readonly [typeof header] };
const variant = defineView(validOutputVariant);
const variantName: "first" | "second" = variant.id;
void variantName;
// @ts-expect-error Renderer identities are not public component properties.
Components.Header({ title: fixtureText.notes, id: "header" });
// @ts-expect-error Component keys are selected from the catalog, never authored strings.
Components.Header({ title: fixtureText.notes, kind: "header" });
// @ts-expect-error There is no generic styling escape.
Components.Text({ text: "Content", style: "color:red" });
// @ts-expect-error Extra properties are rejected even when provided through a variable.
Components.Header({ title: fixtureText.notes, padding: 0 } as const);
// @ts-expect-error Nested toolbar actions cannot add consumer styling.
Components.Toolbar({ actions: [{ output: "save", label: fixtureText.save, icon: "save", class: "p-0" }] });
const styledAction = { output: "save", label: fixtureText.save, icon: "save", style: "padding:0" } as const;
// @ts-expect-error A variable cannot hide nested action properties.
Components.Toolbar({ actions: [styledAction] });
// @ts-expect-error An undefined extra remains an extra property.
Components.Toolbar({ actions: [{ output: "save", label: fixtureText.save, icon: "save", padding: undefined }] });
declare const actionVariant:
  | { readonly output: "save"; readonly label: Message; readonly icon: "save" }
  | { readonly output: "save"; readonly label: Message; readonly icon: "save"; readonly class: "p-0" };
// @ts-expect-error A union cannot hide the extra properties of one action variant.
Components.Toolbar({ actions: [actionVariant] });
declare const validActionVariant:
  | { readonly output: "save"; readonly label: Message; readonly icon: "save" }
  | { readonly output: "save"; readonly label: Message; readonly icon: "save"; readonly disabled: true };
Components.Toolbar({ actions: [validActionVariant] });
// @ts-expect-error A header cannot become a stack item.
Components.Stack({ title: fixtureText.group, items: [header] });
// @ts-expect-error A stack must have a title.
Components.Stack({ items: [paragraph] });
// @ts-expect-error A collection accepts only a collection input reference.
Components.Collection({ input: ports.inputs.draft, output: ports.output.select });
// @ts-expect-error A form accepts a typed input reference rather than a duplicated name.
Components.Form({ input: "draft" });
// @ts-expect-error Authors cannot fabricate catalog components from wire descriptors.
defineView({ name: "notes", content: [{ kind: "header", id: "header", title: fixtureText.notes }] });
// @ts-expect-error View declaration names are semantic; wire id/version are internal.
defineView({ name: "notes", id: "notes", content: [] });
// @ts-expect-error The top dock cannot accept ordinary content.
defineView({ name: "notes", topDock: header, content: [] });
// @ts-expect-error Side docks require a registered View object, never its string ID.
Components.Dock("detail");
// @ts-expect-error Component catalogs do not include an arbitrary HTML constructor.
Components.HTML({ markup: "<div>unowned</div>" });
// @ts-expect-error Builder inference preserves the View output contract.
viewOutput(notes, "missing");
// @ts-expect-error System observations cannot be provided by the product.
Components.SystemStatus({ connected: true });
void [view, exactOutput, exactTitle, exactName, exactReference];
