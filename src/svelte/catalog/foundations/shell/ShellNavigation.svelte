<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  // Shell part (from the catalog-navigation composition): the navigation pane, its identity bar, the destination groups
  // drawn from data, the toggle that hides it and the settings placeholder. Dragging the pane's header toward its edge,
  // or swiping the pane, dismisses it.
  import { untrack } from "svelte";
  import * as Sidebar from "../../../vendor/components/ui/sidebar/index.js";
  import { Bar, Icon, Surface } from "../../index.ts";
  import { swipeMotion } from "../../mechanisms/swipe-motion/swipe-motion.svelte.ts";
  import { providePane } from "../../mechanisms/pane-context/pane-context.svelte.ts";
  import type { ShellNavigation } from "../../../infra/workspace-navigation.ts";
  import { navigationIconNames } from "./navigation-icons.ts";
  let { navigation, searching, onnavigate }: { navigation: ShellNavigation; searching: boolean; onnavigate: (id: string) => void } = $props();
  const sidebar = Sidebar.useSidebar();
  const motion = swipeMotion({ edge: () => "left", enabled: () => sidebar.expanded,
    commit: () => sidebar.presentation === "overlay" ? sidebar.setOverlayOpen(false) : sidebar.setOpen(false) });
  $effect(() => { sidebar.dismissOffset = motion.offset; });
  $effect(() => { if (sidebar.expanded) untrack(() => motion.reset()); });
  // As an overlay the pane is an edge pane its header drags (pane-context); docked, it is part of the workspace.
  providePane(() => sidebar.presentation === "overlay" ? { drag: true, dragging: false, framed: false } : undefined);
  function navigate(id: string) { onnavigate(id); if (sidebar.presentation === "overlay") sidebar.setOverlayOpen(false); }
  // The pane's top bar is the drag handle (the bar itself takes no drag; DESIGN §3.2). Presses on its controls stay theirs.
  const down = (event: PointerEvent) => {
    if (event.target instanceof Element && event.target.closest("button,a,input,select,textarea")) return;
    motion.down(event);
  };
  const handlers = [["pointerdown", down], ["pointermove", motion.move], ["pointerup", motion.up], ["pointercancel", motion.cancel],
    ["lostpointercapture", motion.lost]] as const;
  $effect(() => {
    sidebar.presentation; sidebar.expanded;
    let header: HTMLElement | null = null;
    // The pane mounts in this update (docked, or in its overlay dialog): attach once it is drawn.
    const frame = requestAnimationFrame(() => {
      header = document.getElementById(sidebar.panelId)?.querySelector<HTMLElement>('[data-catalog-navigation] > [data-toolbar="top"]') ?? null;
      if (!header) return;
      header.dataset.navigationDrag = "true";
      for (const [type, handler] of handlers) header.addEventListener(type, handler);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (!header) return;
      delete header.dataset.navigationDrag;
      for (const [type, handler] of handlers) header.removeEventListener(type, handler);
    };
  });
</script>

<Surface kind="navigation" label={say(m.shell.navigation)} searching={false}>
  {#snippet top()}
    <Bar edge="top" purpose="navigation" identity={navigation.identity} identityRole="heading" trailing={[]} settingsPlaceholder={false} inert={false} />
  {/snippet}
  {#snippet content()}
    <div>
      {#each navigation.groups as group (group.label)}
      <Sidebar.Group aria-label={group.label}>
        <Sidebar.GroupLabel>{group.label}</Sidebar.GroupLabel>
        <Sidebar.GroupContent><Sidebar.Menu>
        {#each group.items as destination (destination.id)}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={destination.id === navigation.active} aria-current={destination.id === navigation.active ? "page" : undefined}
              aria-label={destination.label} onclick={() => navigate(destination.id)}>
              <span data-navigation-icon={destination.appearance} aria-hidden="true"><Icon name={navigationIconNames[destination.icon]} /></span>
              <span>{destination.label}</span>
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        {/each}
      </Sidebar.Menu></Sidebar.GroupContent></Sidebar.Group>
      {/each}
    </div>
  {/snippet}
  {#snippet bottom()}
    <!-- The pane's toggle is interactive only while the pane is shown (it is inert otherwise), so it always hides it.
         Feeding the sidebar's own expanded state into the bar here stalls that state's derivation (Svelte 5.57). -->
    <Bar edge="bottom" purpose="navigation" identityRole="heading" trailing={[]} navigationToggle={{ expanded: true, controls: sidebar.panelId }}
      settingsPlaceholder={false} inert={searching} onnavigationtoggle={sidebar.toggle} />
    {#if navigation.settingsPlaceholder}
      <Bar edge="bottom" purpose="navigation" identityRole="heading" trailing={[]} settingsPlaceholder inert={false} />
    {/if}
  {/snippet}
</Surface>
