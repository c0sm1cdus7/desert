<script lang="ts">
  import { AppearancePreferences } from "../../index.ts";
  import { Feedback } from "../../index.ts";
  import { appearance, appearancePersistence, chooseAppearance } from "../../../infra/appearance-state.ts";
</script>

<AppearancePreferences value={$appearance} onchange={chooseAppearance} />
{#if $appearancePersistence}<Feedback text={$appearancePersistence} />{/if}
