// Rule H: native controls are drawn only by foundations (and the vendor families they own); the browser's own media
// controls nowhere. Code: NATIVE_CONTROL_OUTSIDE_FOUNDATION.
import assert from "node:assert/strict";
import test from "node:test";
import { ruleH } from "../src/authoring/catalog/gate/native-controls.ts";
import { codes, composition, contextOf, foundation } from "./support/catalog-context.ts";

const ui = "src/svelte/vendor/components/ui", page = "src/svelte/catalog/compositions/page/Page.svelte";
const controls = '<input>\n<button></button>\n<select></select>\n<textarea></textarea>\n<details></details>\n<dialog></dialog>\n<a href="/x">x</a>\n';
const run = (files: Record<string, string>) => codes(ruleH(contextOf(files)));
const outside = (path: string, element: string, owner: string) =>
  `NATIVE_CONTROL_OUTSIDE_FOUNDATION ${path} <${element}> is drawn by ${owner}: native controls live in a foundation`;

test("H control: a foundation, its parts and its vendor family draw native controls; plain media and anchors pass anywhere", () => {
  const files = { ...foundation("action", "Action.svelte", controls, ', parts: ["ActionPart.svelte"], vendor: ["button"]'),
    "src/svelte/catalog/foundations/action/ActionPart.svelte": "<button></button>\n",
    [`${ui}/button/button.svelte`]: "<button></button>\n<a {href}>x</a>\n",
    ...composition("page", "Page.svelte", [], "<a>anchor without href</a>\n<video src=\"x\"></video>\n<audio></audio>\n") };
  assert.deepEqual(run(files), []);
});

test("H: every native control in a composition is reported", () => {
  assert.deepEqual(run(composition("page", "Page.svelte", [], controls)),
    ["input", "button", "select", "textarea", "details", "dialog", "a href"].map(element => outside(page, element, "composition page")));
});

test("H: a renderer file, a template route, an undeclared vendor family and a mechanism are outside a foundation", () => {
  const route = "src/build/svelte/template/src/routes/+page.svelte", renderer = "src/svelte/catalog/renderer/view/View.svelte";
  const mechanism = "src/svelte/catalog/mechanisms/motion/Motion.svelte";
  const files = { ...composition("view", "View.svelte", [], "{#if x}<input />{/if}\n", "", "src/svelte/catalog/renderer"),
    [route]: '<a href="/">home</a>\n', [`${ui}/orphan/orphan.svelte`]: "<button></button>\n",
    "src/svelte/catalog/mechanisms/motion/motion.mechanism.ts": 'import { defineMechanism } from "x";\nexport const M = defineMechanism({ id: "motion", owner: "theme", files: ["Motion.svelte"] } as const);\n',
    [mechanism]: "<select></select>\n" };
  assert.deepEqual(run(files), [
    outside(route, "a href", "no foundation"),
    outside(mechanism, "select", "mechanism motion"),
    outside(renderer, "input", "composition view"),
    outside(`${ui}/orphan/orphan.svelte`, "button", "an undeclared vendor family"),
  ]);
});

test("H: the browser's own media controls are rejected everywhere, foundations included", () => {
  const files = { ...foundation("player", "Player.svelte", "<video controls src=\"x\"></video>\n<audio controls={true}></audio>\n"),
    ...composition("page", "Page.svelte", [], "<video controls></video>\n") };
  const what = (element: string) => `<${element} controls> draws the browser's own media controls`;
  assert.deepEqual(run(files), [
    `NATIVE_CONTROL_OUTSIDE_FOUNDATION ${page} ${what("video")}`,
    `NATIVE_CONTROL_OUTSIDE_FOUNDATION src/svelte/catalog/foundations/player/Player.svelte ${what("video")}`,
    `NATIVE_CONTROL_OUTSIDE_FOUNDATION src/svelte/catalog/foundations/player/Player.svelte ${what("audio")}`,
  ]);
});
