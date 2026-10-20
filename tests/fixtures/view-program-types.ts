import type { View, ViewJourney, ViewProgram, ViewOutputBinding } from "../../src/index.ts";
import { program } from "./view-program.ts";

const positive: ViewProgram = program;
const bound: View = { version: "desert.view/1", id: "records", outputs: ["select"],
  content: [{ kind: "collection", id: "list", input: "records", output: "select" }] };
// @ts-expect-error Programs contain data, never executable controller callbacks.
const controller = { ...program, controller: () => "local" } satisfies ViewProgram;
// @ts-expect-error Bound composition cannot supply another command input schema.
const customForm = { ...bound, content: [{ kind: "form", id: "editor", input: "draft", inputSchema: {} }] } satisfies View;
// @ts-expect-error Views refer to output ports, not journey identities.
const directJourney = { ...bound, content: [{ kind: "collection", id: "list", input: "records", output: "select", journey: "read-note" }] } satisfies View;
// @ts-expect-error Create bindings declare the one supported adaptive dock preference.
const leftEditor = { ...program.journeys[2], preferredDock: "left" } satisfies ViewJourney;
// @ts-expect-error A read binding must name its detail view.
const noDetail = { id: "read-note", kind: "read", view: "notes", outputs: [] } satisfies ViewJourney;
// @ts-expect-error Unknown output behavior is not a callback or extensible action bag.
const customAction = { view: "notes", output: "select", action: { kind: "custom", run: "anything" } } satisfies ViewOutputBinding;
// @ts-expect-error Navigation is a sequence of destination identities, not component implementations.
const navigation = { ...program, navigation: [{ component: "Sidebar" }] } satisfies ViewProgram;
// @ts-expect-error A compiled presentation contract is deeply readonly.
positive.journeys[0]!.outputs.push({ view: "home", output: "more", action: { kind: "close" } });
void [positive, bound, controller, customForm, directJourney, leftEditor, noDetail, customAction, navigation];
