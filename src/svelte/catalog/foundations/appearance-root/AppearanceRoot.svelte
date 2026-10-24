<script lang="ts">
  // Draws nothing: applies the appearance to the document root while mounted (one per page).
  import { mountAppearanceRoot } from "./appearance-root.ts";
  $effect(() => mountAppearanceRoot());
</script>
