<script lang="ts" generics="Destination extends string">
  import { untrack } from "svelte";
  import * as Sidebar from "@desert/svelte/vendor/components/ui/sidebar/index.js";
  import Landmark from "@lucide/svelte/icons/landmark";
  import Backpack from "@lucide/svelte/icons/backpack";
  import PanelsTopLeft from "@lucide/svelte/icons/panels-top-left";
  import { swipeMotion } from "../../../infra/swipe-motion.svelte.js";
  import { Place } from "../../index.ts";
  import { ToolbarLayout } from "../../index.ts";
  import { actionIcons } from "../../../infra/action-icons.ts";
  import { workspaceNavigation, type WorkspaceDestination } from "../../../infra/workspace-navigation.ts";
  let { identity, navigation, active, onnavigate, searching = false, settingsPlaceholder = false }: {
    identity: { title: string; subtitle?: string }; settingsPlaceholder?: boolean;
    navigation: readonly WorkspaceDestination<Destination>[]; active: Destination;
    onnavigate: (id: Destination) => void; searching?: boolean;
  } = $props();
  const sidebar = Sidebar.useSidebar();
  const motion = swipeMotion({ edge: () => "left", enabled: () => sidebar.expanded,
    commit: () => sidebar.presentation === "overlay" ? sidebar.setOverlayOpen(false) : sidebar.setOpen(false) });
  $effect(() => { sidebar.dismissOffset = motion.offset; });
  $effect(() => { if (sidebar.expanded) untrack(() => motion.reset()); });
  const icons = { ...actionIcons, landmark: Landmark, backpack: Backpack, panels: PanelsTopLeft };
  let groups = $derived(workspaceNavigation(navigation));
  function navigate(id: Destination) { onnavigate(id); if (sidebar.presentation === "overlay") sidebar.setOverlayOpen(false); }
  function startHeaderDrag(event: PointerEvent) {
    if (event.target instanceof Element && event.target.closest('button,a,input,select,textarea')) return;
    motion.down(event);
  }
</script>

<Place landmark="navigation" label="Main navigation">
  {#snippet top()}
  <ToolbarLayout {identity} content={{kind:"actions",actions:[],onevent:()=>{}}} drag={{down:startHeaderDrag,move:motion.move,up:motion.up,cancel:motion.cancel,lost:motion.lost}} />
  {/snippet}
  {#snippet content()}
    <div>
      {#each groups as group (group.label)}
      <Sidebar.Group aria-label={group.label}>
        <Sidebar.GroupLabel>{group.label}</Sidebar.GroupLabel>
        <Sidebar.GroupContent><Sidebar.Menu>
        {#each group.items as destination (destination.id)}
          {@const Icon = icons[destination.icon]}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={destination.id === active} aria-current={destination.id === active ? "page" : undefined}
              aria-label={destination.label} onclick={() => navigate(destination.id)}>
              <span data-navigation-icon={destination.appearance} aria-hidden="true"><Icon /></span>
              <span>{destination.label}</span>
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        {/each}
      </Sidebar.Menu></Sidebar.GroupContent></Sidebar.Group>
      {/each}
    </div>
  {/snippet}
  {#snippet bottom()}
  <ToolbarLayout edge="bottom" content={{kind:"navigation-toggle",searching}} />
  {#if settingsPlaceholder}
  <ToolbarLayout content={{kind:"settings-placeholder"}} />
  {/if}
  {/snippet}
</Place>
