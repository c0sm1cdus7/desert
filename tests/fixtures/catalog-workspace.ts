import { program, surface } from "./view-program.ts";

/** The actual View workspace owns toolbar search; catalog content receives no query. */
export const catalogWorkspaceSource = `<script>
  import Workspace from './src/svelte/views/Workspace.svelte';
  const program = ${JSON.stringify(program)};
  const surface = ${JSON.stringify(surface)};
  const resolved = {view:program.views.find(view=>view.id==='catalog'),bindings:{},disabledOutputs:[]};
</script>
<Workspace {program} {resolved} activeDestination="catalog"
  error={null} uncertain={false} onevent={()=>{}} onnavigate={()=>{}} />`;
