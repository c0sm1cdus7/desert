<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  // Shell part (from the catalog-navigation composition): the navigation pane, its identity bar, the destination groups
  // drawn from data, the toggle that hides it and the settings placeholder. Dragging the pane's header toward its edge,
  // or swiping the pane, dismisses it. Docked, it is the sidebar; over a workspace with no room to dock it, it is the
  // navigation Modal, which an edge swipe (CatalogEdgeNavigation) may reveal under the pointer before it opens.
  import { untrack } from "svelte";
  import * as Sidebar from "../../../vendor/components/ui/sidebar/index.js";
  import { Bar, Icon, Modal, Surface } from "../../index.ts";
  import { provideCloseFocus } from "../../mechanisms/surface-focus/focus-return.ts";
  import { swipeMotion } from "../../mechanisms/swipe-motion/swipe-motion.svelte.ts";
  import type { ShellNavigation } from "../../../infra/workspace-navigation.ts";
  import { navigationIconNames } from "./navigation-icons.ts";
  let { navigation, searching, onnavigate }: { navigation: ShellNavigation; searching: boolean; onnavigate: (id: string) => void } = $props();
  const sidebar = Sidebar.useSidebar();
  // Closing the overlay returns focus where the sidebar decides (the control that opened it, or its equivalent).
  provideCloseFocus(sidebar.handleCloseAutoFocus);
  const motion = swipeMotion({ edge: () => "left", enabled: () => sidebar.expanded,
    commit: () => sidebar.presentation === "overlay" ? sidebar.setOverlayOpen(false) : sidebar.setOpen(false) });
  $effect(() => { sidebar.dismissOffset = motion.offset; });
  $effect(() => { if (sidebar.expanded) untrack(() => motion.reset()); });
  function navigate(id: string) { onnavigate(id); if (sidebar.presentation === "overlay") sidebar.setOverlayOpen(false); }
  // The pane's top bar is the drag handle (the bar itself takes no drag; DESIGN §3.2). Presses on its controls stay theirs.
  const down = (event: PointerEvent) => {
    if (event.target instanceof Element && event.target.closest("button,a,input,select,textarea")) return;
    motion.down(event);
  };
  const handlers = [["pointerdown", down], ["pointermove", motion.move], ["pointerup", motion.up], ["pointercancel", motion.cancel],
    ["lostpointercapture", motion.lost]] as const;
  $effect(() => {
    sidebar.presentation; sidebar.expanded; sidebar.revealing;
    let header: HTMLElement | null = null;
    // The pane mounts in this update (docked, in its overlay modal, or drawn by an edge swipe): attach once it is drawn.
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

{#snippet pane()}
<Surface kind="navigation" label={say(m.shell.navigation)} searching={false}>
  {#snippet top()}
    <Bar edge="top" purpose="navigation" identity={navigation.identity} identityRole="heading" trailing={[]} settingsPlaceholder={false} inert={false} />
  {/snippet}
  {#snippet content()}
    <div data-navigation-destinations>
      {#each navigation.groups as group (group.label)}
      <Sidebar.Group aria-label={group.label}>
        <Sidebar.GroupLabel>{group.label}</Sidebar.GroupLabel>
        <Sidebar.GroupContent><Sidebar.Menu>
        {#each group.items as destination (destination.id)}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={destination.id === navigation.active} aria-current={destination.id === navigation.active ? "page" : undefined}
              aria-label={destination.label} onclick={() => navigate(destination.id)}>
              <span data-navigation-icon={destination.appearance} aria-hidden="true"><Icon name={navigationIconNames[destination.icon]} size="lead" /></span>
              <span data-navigation-label>{destination.label}</span>
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
{/snippet}

{#if sidebar.presentation === "overlay"}
  <Modal label={say(m.shell.navigationTitle)} open={sidebar.overlayOpen} locked={false} presentation="navigation"
    navigation={{ panel: sidebar.panelId, reveal: sidebar.revealOffset ?? undefined, dismissOffset: sidebar.dismissOffset, gesture: sidebar.revealedByGesture }}
    ondismiss={() => sidebar.setOverlayOpen(false)}>{@render pane()}</Modal>
{:else}
  <Sidebar.Root variant="floating">{@render pane()}</Sidebar.Root>
{/if}
