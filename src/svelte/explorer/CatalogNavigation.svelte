<script lang="ts">
  import { untrack } from "svelte";
  import * as Sidebar from "@desert/svelte/vendor/components/ui/sidebar/index.js";
  import Landmark from "@lucide/svelte/icons/landmark";
  import Backpack from "@lucide/svelte/icons/backpack";
  import PanelsTopLeft from "@lucide/svelte/icons/panels-top-left";
  import Settings from "@lucide/svelte/icons/settings";
  import { Button } from "../vendor/components/ui/button/index.js";
  import { swipeMotion } from "../pieces/swipe-motion.svelte.js";
  import Place from "../pieces/Place.svelte";
  import ToolbarLayout from "../pieces/ToolbarLayout.svelte";
  type Destination = "browse" | "travel-kit" | "bank";
  let { productName, navigation, active, onnavigate, searching = false }: {
    productName: string;
    navigation: readonly { id: Destination; label: string; shortLabel?: string }[]; active: Destination;
    onnavigate: (id: Destination) => void; searching?: boolean;
  } = $props();
  const sidebar = Sidebar.useSidebar();
  const motion = swipeMotion({ edge: () => "left", enabled: () => sidebar.expanded,
    commit: () => sidebar.presentation === "overlay" ? sidebar.setOverlayOpen(false) : sidebar.setOpen(false) });
  $effect(() => { sidebar.dismissOffset = motion.offset; });
  $effect(() => { if (sidebar.expanded) untrack(() => motion.reset()); });
  const icons = { browse: Landmark, "travel-kit": Backpack, bank: PanelsTopLeft };
  const groups = [{ label: "Explore", ids: ["browse", "travel-kit"] }, { label: "Developer", ids: ["bank"] }];
  function navigate(id: Destination) { onnavigate(id); if (sidebar.presentation === "overlay") sidebar.setOverlayOpen(false); }
  function startHeaderDrag(event: PointerEvent) {
    if (event.target instanceof Element && event.target.closest('button,a,input,select,textarea')) return;
    motion.down(event);
  }
</script>

<Place data-renderer-profile="apple-reference" data-catalog-navigation
  viewportAttributes={{ 'data-slot': 'sidebar-content' }}>
  {#snippet top()}
  <ToolbarLayout class="sidebar-toolbar" data-slot="sidebar-header" data-navigation-drag role="presentation" onpointerdown={startHeaderDrag} onpointermove={motion.move}
    onpointerup={motion.up} onpointercancel={motion.cancel} onlostpointercapture={motion.lost}>
    <span data-product-name>{productName}</span>
    <Sidebar.Trigger variant="secondary" size="icon" aria-label="Hide navigation" title="Hide navigation" inert={searching} aria-hidden={searching} />
  </ToolbarLayout>
  {/snippet}
  {#snippet content()}
    <nav aria-label="Main navigation">
      {#each groups as group (group.label)}
      <Sidebar.Group aria-label={group.label}>
        <Sidebar.GroupLabel>{group.label}</Sidebar.GroupLabel>
        <Sidebar.GroupContent><Sidebar.Menu>
        {#each navigation.filter(destination => group.ids.includes(destination.id)) as destination (destination.id)}
          {@const Icon = icons[destination.id]}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={destination.id === active} aria-current={destination.id === active ? "page" : undefined}
              aria-label={destination.label} onclick={() => navigate(destination.id)}>
              <span data-navigation-icon={destination.id} aria-hidden="true"><Icon /></span>
              <span>{destination.label}</span>
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        {/each}
      </Sidebar.Menu></Sidebar.GroupContent></Sidebar.Group>
      {/each}
    </nav>
  {/snippet}
  {#snippet bottom()}
  <ToolbarLayout class="sidebar-toolbar" data-slot="sidebar-footer" edge="bottom">
    <Button variant="secondary" size="icon" aria-label="Settings" title="Settings — not available in this preview" disabled>
      <Settings aria-hidden="true" />
    </Button>
  </ToolbarLayout>
  {/snippet}
</Place>
