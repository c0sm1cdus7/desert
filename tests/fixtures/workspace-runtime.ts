import { program, surface } from "./view-program.ts";
import type { ViewProgram } from "../../src/views/program-schema.ts";

export function workspaceRuntimeSource(options: { navigation?: boolean; title?: string } = {}) {
  const candidate: ViewProgram = {
    ...program,
    views: [...program.views.filter(view => options.navigation !== false || view.id !== "workspace-navigation").map(view => {
      if (view.id === "workspace" && options.navigation === false) {
        const { leftDock, ...root } = view;
        return root;
      }
      if (view.id === "workspace-navigation" && options.title) return { ...view, content: [
        { kind: "header" as const, id: "navigation-title", title: options.title, subtitle: "Shared destinations" },
        { kind: "navigation" as const },
      ] };
      if (view.id !== "home") return view;
      return { ...view, content: [...view.content, ...Array.from({ length: 30 }, (_, index) => ({
        kind: "stack" as const, id: `section-${index}`, title: `Section ${index}`, items: [
          { kind: "text" as const, text: "Content remains in its own scroll viewport while shared navigation stays mounted." },
        ],
      }))] };
    }), { version: "desert.view/1", id: "media", content: [
      { kind: "header", id: "media-header", title: "Media", subtitle: "A presentation destination." },
    ] }],
    journeys: [...program.journeys, { id: "media", kind: "presentation", view: "media", outputs: [] }],
    destinations: [...program.destinations, { id: "media", label: "Media", icon: "media", entryJourney: "media" }],
    navigation: [...program.navigation, { destination: "media", group: "Explore", purpose: "content" }],
  };
  return `<script>
    import Workspace from './src/svelte/views/Workspace.svelte';
    import { viewProgramModel } from './src/web/client/view-program.ts';
    import { webTransport } from './src/web/client/transport.ts';
    import { onDestroy } from 'svelte';
    const model = viewProgramModel(${JSON.stringify(candidate)}, ${JSON.stringify(surface)}, () => true,
      webTransport(${JSON.stringify(surface.contractDigest)}, { kind: 'developer' }));
    let snapshot = $state.raw(model.snapshot());
    const unsubscribe = model.subscribe(() => snapshot = model.snapshot());
    onDestroy(() => { unsubscribe(); model.stop(); });
  </script>
  <Workspace {...snapshot} onevent={model.event} onnavigate={model.navigate} />`;
}
