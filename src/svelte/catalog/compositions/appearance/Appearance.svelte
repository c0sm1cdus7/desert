<script lang="ts">
  import AppearancePreferences from "../appearance-preferences/AppearancePreferences.svelte";
  import Feedback from "../../foundations/feedback/Feedback.svelte";
  import { appearance, appearancePersistence, chooseAppearance } from "../../../infra/appearance-state.ts";
</script>

<AppearancePreferences value={$appearance} onchange={chooseAppearance} />
{#if $appearancePersistence}<Feedback text={$appearancePersistence} />{/if}
