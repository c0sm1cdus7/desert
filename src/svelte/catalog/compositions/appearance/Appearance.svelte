<script lang="ts">
  import { AppearancePreferences, Text } from "../../index.ts";
  import { appearance, appearancePersistence, chooseAppearance } from "../../../infra/appearance-state.ts";
</script>

<AppearancePreferences value={$appearance} onchange={chooseAppearance} />
{#if $appearancePersistence}<Text kind="support" live="polite" text={$appearancePersistence} />{/if}
