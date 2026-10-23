import test from "node:test";
import assert from "node:assert/strict";
import { view, ViewVersion } from "../src/views/index.ts";
import { appearanceChoices, appearancePreferences, defaultAppearance, effectiveAppearanceTheme, migrateAppearancePreferences } from "../src/svelte/pieces/appearance-preferences.ts";

test("appearance is a closed catalog composition with no product-owned style knobs", () => {
  const definition = { version: ViewVersion, id: "appearance", content: [{ kind: "appearance", id: "preferences" }] };
  assert.equal(view(definition).content[0]?.kind, "appearance");
  for (const property of ["style", "class", "theme", "padding", "controls"]) {
    assert.throws(() => view({ ...definition, content: [{ ...definition.content[0], [property]: "custom" }] }), /INVALID_VIEW/);
  }
});

test("appearance preferences are finite, default to system, and reject stored extensions", () => {
  assert.deepEqual(defaultAppearance, { theme: "system", textSize: "standard", tint: "blue", wallpaper: "silk" });
  assert.deepEqual(appearancePreferences({ ...defaultAppearance, theme: "dark", textSize: "large" }), { ...defaultAppearance, theme: "dark", textSize: "large" });
  for (const value of [null, {}, { theme: "blue", textSize: "standard" }, { theme: "light", textSize: "tiny" },
    { theme: "system", textSize: "standard", style: "bad" }]) assert.equal(appearancePreferences(value), null);
});

test("previous appearance choices migrate without losing theme or text size", () => {
  assert.deepEqual(migrateAppearancePreferences({ theme:"dark", textSize:"large" }), { ...defaultAppearance, theme:"dark", textSize:"large" });
  assert.equal(migrateAppearancePreferences({ theme:"light", textSize:"large", style:"bad" }), null);
});

test("appearance offers only explicit modes while legacy system preferences resolve without mutation", () => {
  assert.deepEqual(appearanceChoices.theme.map(choice => choice.value), ["dark", "light"]);
  assert.equal(effectiveAppearanceTheme("system", true), "dark");
  assert.equal(effectiveAppearanceTheme("system", false), "light");
  assert.equal(effectiveAppearanceTheme("dark", false), "dark");
  assert.equal(effectiveAppearanceTheme("light", true), "light");
  assert.deepEqual(appearancePreferences(defaultAppearance), defaultAppearance);
});
