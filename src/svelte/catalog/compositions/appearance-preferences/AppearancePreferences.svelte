<script lang="ts">
  import { onMount } from "svelte";
  import * as RadioGroup from "../../../vendor/components/ui/radio-group/index.js";
  import SelectionField from "../../foundations/selection-field/SelectionField.svelte";
  import StackLayout from "../../foundations/stack-layout/StackLayout.svelte";
  import Wallpaper from "../../foundations/wallpaper/Wallpaper.svelte";
  import AppearancePreview from "../appearance-preview/AppearancePreview.svelte";
  import { appearanceChoices, appearancePreferences, effectiveAppearanceTheme, type AppearancePreferences } from "../../../infra/appearance-preferences.ts";
  let { value, onchange, disabled = false }: {
    value: AppearancePreferences; onchange: (value: AppearancePreferences) => void; disabled?: boolean;
  } = $props();
  const id = $props.id();
  let systemDark = $state(false);
  let selectedTheme = $derived(effectiveAppearanceTheme(value.theme, systemDark));
  onMount(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => systemDark = media.matches;
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  });
  function choose(field: keyof AppearancePreferences, selected: string) {
    const next = appearancePreferences({ ...value, [field]: selected });
    if (next) onchange(next);
  }
</script>
<div class="appearance-preferences" data-appearance-preferences>
  <StackLayout title="Appearance">
    <RadioGroup.Root aria-label="Appearance" value={selectedTheme} {disabled} onValueChange={selected => choose("theme", selected)}><div class="appearance-mode-grid">
      {#each appearanceChoices.theme as choice}
        <label class="appearance-wallpaper-choice" data-material="pane" data-personalization-choice data-selected={selectedTheme === choice.value} for={`${id}-theme-${choice.value}`}>
          <AppearancePreview mode={choice.value} tint={value.tint} wallpaper={value.wallpaper} />
          <span class="appearance-wallpaper-label"><RadioGroup.Item id={`${id}-theme-${choice.value}`} value={choice.value} aria-label={choice.label}
            onclick={() => { if (value.theme === "system" && selectedTheme === choice.value) choose("theme", choice.value); }} /><span>{choice.label}</span></span>
        </label>
      {/each}
    </div></RadioGroup.Root>
  </StackLayout>
  <StackLayout title="Text size" headingVisibility="accessible">
    <SelectionField selection={`${id}-text-size`} label="Text size" value={value.textSize} {disabled} fieldControl
      options={appearanceChoices.textSize.map(choice => ({ ...choice, disabled: false }))}
      onchange={selected => choose("textSize", selected)} />
  </StackLayout>
  <StackLayout title="Tint">
    <RadioGroup.Root aria-label="Tint" value={value.tint} {disabled} onValueChange={selected => choose("tint", selected)}><div class="appearance-tint-rail">
      {#each appearanceChoices.tint as choice}
        <label class="appearance-swatch" data-tint-choice={choice.value} data-selected={value.tint === choice.value} for={`${id}-tint-${choice.value}`} title={choice.label}>
          <RadioGroup.Item presentation="swatch" id={`${id}-tint-${choice.value}`} value={choice.value} aria-label={choice.label} /><span class="sr-only">{choice.label}</span>
        </label>
      {/each}
    </div></RadioGroup.Root>
  </StackLayout>
  <StackLayout title="Wallpaper">
    <RadioGroup.Root aria-label="Wallpaper" value={value.wallpaper} {disabled} onValueChange={selected => choose("wallpaper", selected)}><div class="appearance-wallpaper-grid">
      {#each appearanceChoices.wallpaper as choice}
        <label class="appearance-wallpaper-choice" data-material="pane" data-personalization-choice data-selected={value.wallpaper === choice.value} for={`${id}-wallpaper-${choice.value}`}>
          <Wallpaper wallpaper={choice.value} preview /><span class="appearance-wallpaper-label"><RadioGroup.Item id={`${id}-wallpaper-${choice.value}`} value={choice.value} aria-label={choice.label} /><span>{choice.label}</span></span>
        </label>
      {/each}
    </div></RadioGroup.Root>
  </StackLayout>
</div>
<style>
  .appearance-preferences { display:grid; gap:1.75rem; min-width:0; }
  .appearance-wallpaper-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,8rem),1fr)); gap:.75rem; }
  .appearance-mode-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,8rem),1fr)); gap:.75rem; max-width:24rem; }
  [data-selected="true"] { outline:2px solid var(--ring); outline-offset:1px; }
  label:has(:focus-visible) { outline:3px solid var(--ring); outline-offset:3px; }
  label:has(:disabled) { cursor:default; opacity:.5; }
  .appearance-tint-rail { display:flex; flex-wrap:wrap; gap:.25rem; padding:.25rem; }
  .appearance-swatch { position:relative; display:grid; place-items:center; width:2.75rem; height:2.75rem; border-radius:50%; cursor:pointer; }
  .appearance-swatch::before { content:""; position:absolute; width:2rem; height:2rem; border-radius:50%; border:1px solid var(--border); background:var(--swatch); pointer-events:none; }
  .appearance-swatch[data-selected="true"] { outline:none; }
  .appearance-swatch[data-selected="true"]::before { outline:2px solid var(--ring); outline-offset:2px; }
  [data-tint-choice="blue"] { --swatch:#2967be; } [data-tint-choice="violet"] { --swatch:#7452ac; } [data-tint-choice="rose"] { --swatch:#a23e69; } [data-tint-choice="green"] { --swatch:#26745f; } [data-tint-choice="slate"] { --swatch:#586575; }
  .appearance-wallpaper-choice { min-width:0; display:grid; gap:.625rem; padding:.625rem; border-radius:var(--radius); cursor:pointer; }
  .appearance-wallpaper-label { display:flex; justify-content:center; align-items:center; gap:.5rem; padding:.125rem; }
</style>
