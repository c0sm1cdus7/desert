<script lang="ts">
  import AppearancePreferences from "./AppearancePreferences.svelte";
  import Feedback from "./Feedback.svelte";
  import { appearance, appearancePersistence, chooseAppearance } from "./appearance-state.ts";
</script>

<AppearancePreferences value={$appearance} onchange={chooseAppearance} />
{#if $appearancePersistence}<Feedback text={$appearancePersistence} />{/if}
