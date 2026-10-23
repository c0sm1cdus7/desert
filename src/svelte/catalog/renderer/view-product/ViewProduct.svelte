<script lang="ts">
  import type { ViewProgram } from "../../../../views/program-schema.ts";
  import type { HumanSurface, ValidateInput } from "../../../../web/types.ts";
  import { ViewProductContent } from "../../../adapter-catalog.ts";
  import type { AccessClient } from "../../../../web/client/access.ts";

  let { program, surface, validateInput, access }: {
    program: ViewProgram; surface: HumanSurface; validateInput: ValidateInput; access?: Pick<AccessClient, "lock">;
  } = $props();
</script>

<ViewProductContent {program} {surface} {validateInput} {access} />
