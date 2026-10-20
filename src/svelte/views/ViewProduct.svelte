<script lang="ts">
  import { onMount, untrack } from "svelte";
  import type { ViewProgram } from "../../views/program-schema.ts";
  import type { HumanSurface, ValidateInput } from "../../web/types.ts";
  import { viewProgramModel } from "../../web/client/view-program.ts";
  import { requireCatalog } from "../../interaction/catalog.ts";
  import Workspace from "./Workspace.svelte";
  import "../theme.css";

  let { program, surface, validateInput }: {
    program: ViewProgram; surface: HumanSurface; validateInput: ValidateInput;
  } = $props();
  const model = untrack(() => {
    requireCatalog(surface.catalog);
    return viewProgramModel(program, surface, validateInput);
  });
  let current = $state.raw(model.snapshot());
  onMount(() => {
    const root = document.documentElement;
    const previousProfile = root.dataset.rendererProfile;
    root.dataset.rendererProfile = "apple-reference";
    const unsubscribe = model.subscribe(() => { current = model.snapshot(); });
    const invitation = new URLSearchParams(location.hash.slice(1)).get("access");
    history.replaceState(null, "", location.pathname + location.search);
    void model.start(invitation ?? undefined);
    const protectDraft = (event: BeforeUnloadEvent) => {
      if (Object.values(current.state.draft).some(Boolean) || current.state.prepared) {
        event.preventDefault(); event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", protectDraft);
    return () => {
      unsubscribe(); model.stop();
      window.removeEventListener("beforeunload", protectDraft);
      if (previousProfile === undefined) delete root.dataset.rendererProfile;
      else root.dataset.rendererProfile = previousProfile;
    };
  });
</script>

<Workspace program={current.program} activeDestination={current.activeDestination}
  resolved={current.resolved} panel={current.panel} error={current.error} uncertain={current.uncertain}
  {surface} {validateInput} onevent={model.event} onnavigate={model.navigate} />
