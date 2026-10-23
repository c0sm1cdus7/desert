import assert from "node:assert/strict";
import test from "node:test";
import { compileViewProgram } from "../src/views/program.ts";
import { viewProgramModel } from "../src/web/client/view-program.ts";
import { workspaceNavigation } from "../src/svelte/explorer/workspace-navigation.ts";
import { program, surface } from "./fixtures/view-program.ts";

const navigation = [
  { destination: "home", group: "Workspace", purpose: "content" },
  { destination: "notes", group: "Workspace", purpose: "content" },
  { destination: "catalog", group: "Tools", purpose: "utility" },
] as const;
const candidate = () => ({ ...structuredClone(program), version: "desert.view-program/4", navigation });

test("navigation purpose and grouping do not change when an icon or destination ID changes", () => {
  for (const id of ["plain", "bank", "travel-kit"]) for (const icon of ["open", "catalog"] as const) {
    const groups = workspaceNavigation([{ id, label: "Destination", icon, group: "Workspace", purpose: "content" }]);
    assert.deepEqual(groups.filter(group => group.items.length).map(group => group.label), ["Workspace"]);
    assert.equal(groups.find(group => group.label === "Workspace")?.items[0]?.appearance, "browse");
  }
});

test("the executable navigation is authored semantic metadata, not a renderer icon convention", () => {
  const compiled = compileViewProgram(candidate(), surface);
  assert.deepEqual(compiled.navigation, navigation);
  assert.ok(Object.isFrozen(compiled.navigation[0]));
  assert.throws(() => compileViewProgram({ ...candidate(), navigation: ["home"] }, surface), /INVALID_VIEW_PROGRAM/);
  assert.throws(() => compileViewProgram({ ...candidate(), version: "desert.view-program/1" }, surface), /INVALID_VIEW_PROGRAM/);
  for (const patch of [{ purpose: "blue" }, { group: "" }, { class: "custom" }]) {
    assert.throws(() => compileViewProgram({ ...candidate(), navigation: [{ ...navigation[0], ...patch }] }, surface), /INVALID_VIEW_PROGRAM/);
  }
  assert.throws(() => compileViewProgram({ ...candidate(), navigation: [navigation[0], navigation[0]] }, surface), /DUPLICATE_NAVIGATION_DESTINATION/);
  assert.throws(() => compileViewProgram({ ...candidate(), navigation: [{ ...navigation[0], destination: "missing" }] }, surface), /UNKNOWN_NAVIGATION_DESTINATION/);
});

test("two reachable destinations need not be sidebar entries and navigation does not issue reads", () => {
  const value: any = candidate();
  value.navigation = navigation.filter(item => item.destination !== "catalog");
  const home = value.views.find((view: any) => view.id === "home");
  home.outputs.push("catalog"); home.content[1].items.push({ kind: "destination-link", id: "catalog-link", output: "catalog", label: "Inspect" });
  value.journeys[0].outputs.push({ view: "home", output: "catalog", action: { kind: "journey", journey: "catalog" } });
  const catalog = value.views.find((view: any) => view.id === "catalog");
  catalog.outputs = ["more"]; catalog.content.push({ kind: "stack", id: "destinations", title: "Explore", items: [
    { kind: "destination-link", id: "more-link", output: "more", label: "More" }] });
  value.journeys.find((journey: any) => journey.id === "catalog").outputs = [
    { view: "catalog", output: "more", action: { kind: "journey", journey: "more" } },
  ];
  value.views.push({ version: "desert.view/1", id: "more", content: [{ kind: "text", text: "An internal destination." }] });
  value.journeys.push({ id: "more", kind: "presentation", view: "more", outputs: [] });
  value.destinations.push({ id: "more", label: "More", icon: "open", entryJourney: "more" });
  const model = viewProgramModel(value, surface, () => true);
  try {
    assert.deepEqual(model.snapshot().program.navigation.map(item => item.destination), ["home", "notes"]);
    model.navigate("catalog"); assert.equal(model.snapshot().activeDestination, "catalog");
    model.navigate("more"); assert.equal(model.snapshot().activeDestination, "more");
    assert.equal(model.snapshot().state.loaded, false);
    assert.throws(() => model.navigate("missing"), /UNKNOWN_VIEW_DESTINATION/);
  } finally { model.stop(); }
  const disconnected: any = structuredClone(value);
  disconnected.journeys.find((journey: any) => journey.id === "catalog").outputs[0].action.journey = "home";
  assert.throws(() => compileViewProgram(disconnected, surface), /UNREACHABLE_PROGRAM_JOURNEY/);
});
