<script lang="ts">
  import { m } from "../../../../messages/keys.ts";
  import { Choice, Column, StackLayout } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { appearanceChoices, appearancePreferences, effectiveAppearanceTheme, type AppearancePreferences } from "../../../infra/appearance-preferences.ts";
  import { systemScheme } from "../../../infra/appearance-store.ts";
  import { say } from "../../../infra/messages.ts";
  let { value, onchange, disabled = false }: CatalogProps<"appearance-preferences"> = $props();
  // A stored "system" theme shows as the scheme AppearanceRoot published; choosing that card again keeps it explicitly.
  let selectedTheme = $derived(effectiveAppearanceTheme(value.theme, $systemScheme === "dark"));
  let themes = $derived(appearanceChoices.theme.map(choice => ({ value: choice.value, label: say(choice.label), disabled: false,
    leading: { kind: "theme" as const, mode: choice.value, tint: value.tint, wallpaper: value.wallpaper } })));
  const sizes = appearanceChoices.textSize.map(choice => ({ value: choice.value, label: say(choice.label), disabled: false }));
  const tints = appearanceChoices.tint.map(choice => ({ value: choice.value, label: say(choice.label), disabled: false, leading: { kind: "color" as const, color: choice.value } }));
  const wallpapers = appearanceChoices.wallpaper.map(choice => ({ value: choice.value, label: say(choice.label), disabled: false,
    leading: { kind: "wallpaper" as const, wallpaper: choice.value } }));
  function choose(field: keyof AppearancePreferences, selected: readonly string[]) {
    const next = appearancePreferences({ ...value, [field]: selected[0] });
    if (next) onchange?.(next);
  }
</script>
<Column gap="section">
  <StackLayout title={say(m.appearancePreferences.appearance)}>
    <Choice presentation="cards" cardinality="one" label={say(m.appearancePreferences.appearance)} labelVisibility="accessible" options={themes}
      selected={[selectedTheme]} {disabled} required={false} onchange={next => choose("theme", next)} />
  </StackLayout>
  <StackLayout title={say(m.appearancePreferences.textSize)} headingVisibility="accessible">
    <Choice presentation="menu" cardinality="one" menuTrigger="well" label={say(m.appearancePreferences.textSize)} labelVisibility="accessible"
      options={sizes} selected={[value.textSize]} {disabled} required={false} onchange={next => choose("textSize", next)} />
  </StackLayout>
  <StackLayout title={say(m.appearancePreferences.tint)}>
    <Choice presentation="swatches" cardinality="one" label={say(m.appearancePreferences.tint)} labelVisibility="accessible" options={tints}
      selected={[value.tint]} {disabled} required={false} onchange={next => choose("tint", next)} />
  </StackLayout>
  <StackLayout title={say(m.appearancePreferences.wallpaper)}>
    <Choice presentation="cards" cardinality="one" label={say(m.appearancePreferences.wallpaper)} labelVisibility="accessible" options={wallpapers}
      selected={[value.wallpaper]} {disabled} required={false} onchange={next => choose("wallpaper", next)} />
  </StackLayout>
</Column>
