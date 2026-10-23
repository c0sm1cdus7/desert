<script lang="ts">
  import { onMount, untrack } from "svelte";
  import type { ViewProgram } from "../../../../views/program-schema.ts";
  import type { HumanSurface, ValidateInput } from "../../../../web/types.ts";
  import { viewProgramModel } from "../../../../web/client/view-program.ts";
  import { requireCatalog } from "../../../../interaction/catalog.ts";
  import ViewWorkspace from "../view-workspace/ViewWorkspace.svelte";
  import { mountBrowserSession } from "../../../../web/client/browser-session.ts";
  import type { AccessClient } from "../../../../web/client/access.ts";
  import { provideFormFiles } from "../../../infra/form-files.ts";
  import { providePrivateImages } from "../../../infra/private-image-context.ts";
  import { browserActivityHost } from "./activity-host.ts";
  import { useAccess } from "../../../infra/access-context.ts";
  import { webTransport } from "../../../../web/client/transport.ts";

  let { program, surface, validateInput, access }: {
    program: ViewProgram; surface: HumanSurface; validateInput: ValidateInput; access?: Pick<AccessClient, "lock">;
  } = $props();
  const files = provideFormFiles();
  const session = useAccess();
  const model = untrack(() => {
    requireCatalog(surface.catalog);
    if (!session) throw new Error("BROWSER_SESSION_REQUIRED");
    const identityState = session.snapshot().state;
    return viewProgramModel(program, surface, validateInput, webTransport(surface.contractDigest, session.client.binding()), access, files,
      program.journeys.some(journey => journey.kind === "activity")
        ? browserActivityHost(surface.contractDigest, surface.id, identityState) : undefined,
      identityState.kind === "ready" ? { displayName:identityState.identity.displayName } : undefined);
  });
  providePrivateImages(model.images);
  let current = $state.raw(model.snapshot());
  onMount(() => mountBrowserSession(model, snapshot => { current = snapshot; }));
</script>

<ViewWorkspace program={current.program} activeDestination={current.activeDestination}
  resolved={current.resolved} panel={current.panel} error={current.error} uncertain={current.uncertain}
  onevent={model.event} onnavigate={model.navigate} />
