import { ViewVersion, type View } from "../../src/index.ts";

const header = { kind: "header", id: "identity", title: "Notes", subtitle: "Your writing." } as const;
const text = { kind: "text", text: "Introduction." } as const;
const stack = { kind: "stack", id: "recent", title: "Recent", items: [text] } as const;
const toolbar = { kind: "toolbar", actions: [{ output: "create", label: "New", icon: "create" }] } as const;
const base = { version: ViewVersion, id: "notes", outputs: ["create"],
  topDock: toolbar, content: [header, text, stack], rightDock: { kind: "view", view: "detail" },
} as const satisfies View;
const valid: View = base;
// @ts-expect-error Content is a sequence, not a forced stack envelope.
const forcedStack = { ...base, content: stack } satisfies View;
// @ts-expect-error Header is independent content, not a stack item.
const nestedHeader = { ...base, content: [{ ...stack, items: [header] }] } satisfies View;
// @ts-expect-error Every stack has a title.
const untitledStack = { ...base, content: [{ kind: "stack", id: "recent", items: [text] }] } satisfies View;
// @ts-expect-error The top dock only accepts a toolbar.
const wrongTop = { ...base, topDock: { kind: "view", view: "detail" } } satisfies View;
// @ts-expect-error Side docks accept a view reference, not toolbar content.
const wrongSide = { ...base, rightDock: toolbar } satisfies View;
// @ts-expect-error Product style input is not View vocabulary.
const styled = { ...base, style: "padding:0" } satisfies View;
// @ts-expect-error Nested catalog descriptors cannot accept a class override.
const styledChild = { ...base, content: [{ ...text, class: "large" }] } satisfies View;
// @ts-expect-error Actions emit outputs; views cannot select journeys.
const journeyAction = { ...base, topDock: { ...toolbar, actions: [{ ...toolbar.actions[0], journey: "create-note" }] } } satisfies View;
// @ts-expect-error Input bindings are not installed in this literal authoring slice.
const bound = { ...base, inputs: { note: "Note" } } satisfies View;
// @ts-expect-error Fields are not part of the passive catalog subset.
const field = { ...base, content: [{ kind: "input.text", name: "title", value: "" }] } satisfies View;
// @ts-expect-error A declared View is deeply readonly.
valid.content.push(text);
void [valid, forcedStack, nestedHeader, untitledStack, wrongTop, wrongSide, styled, styledChild, journeyAction, bound, field];
