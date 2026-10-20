<script lang="ts">
  import { InteractionCatalog } from "../../interaction/catalog.ts";
</script>

<!-- Shared rules, not another semantic inventory or a set of fake specimens. -->
<section aria-label="Shared renderer owners" class="flex min-w-0 flex-col gap-4 px-4">
  <p class="type-caption text-muted-foreground">Six shared owners. Components below reuse these rules; a fixture does not imply full qualification.</p>
  <dl class="grid min-w-0 gap-4 sm:grid-cols-2">
    {#each InteractionCatalog.foundations as owner (owner.id)}
      <div data-foundation={owner.id} class="flex min-w-0 flex-col gap-1">
        <dt class="type-section">{owner.title}</dt>
        <dd class="type-caption text-muted-foreground">{owner.rule}</dd>
        <dd class="type-caption break-all text-muted-foreground">{#each owner.sources as source}<code class="block">{source}</code>{/each}</dd>
      </div>
    {/each}
  </dl>
</section>
