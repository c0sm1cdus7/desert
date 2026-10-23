import { compile } from "../../src/compile.ts";
import { Notebook } from "../../products/notebook/product.ts";
import { program, surface } from "./view-program.ts";
import { compileViewProgram } from "../../src/views/program.ts";
import { projectViewPanel } from "../../src/web/client/view-projection.ts";
import { humanState } from "../../src/web/client/state.ts";
import type { ViewContent, ViewHeader } from "../../src/views/schema.ts";
import { viewReadScope } from "./view-read-scope.ts";

export function panelSequenceFixture(kind: "form" | "context", complex: boolean, media?: ViewHeader["media"]) {
  const id = kind === "form" ? "editor" : "detail", index = kind === "form" ? 2 : 1;
  const source = { ...program, views: program.views.map(view => {
    if (view.id !== id) return view;
    const header = { ...view.content[0], ...(media ? { media } : {}) };
    if (!complex) return { ...view, content: [header, view.content[1]] };
    const body = view.content[1];
    if (body.kind !== "form" && body.kind !== "context") throw new Error("Expected bound body");
    return { ...view, content: [header, { kind: "text", text: "Before the bound content." },
      { kind: "stack", id: "details", title: "Details", items: [body] },
      { kind: "text", text: "After the bound content." }] satisfies ViewContent[] };
  }) };
  const value = compileViewProgram(source, surface), application = compile(Notebook);
  const validate = (id: string, input: unknown) => application.validateInput(id, input).valid;
  const scope = viewReadScope(value, surface, validate, program.journeys[1].id);
  const store = humanState(surface, scope);
  store.update({ view: kind === "form" ? "create" : "detail", draft: { title: "Writing", body: "Body" },
    selectedId: "one", detail: { id: "one", version: 1, facts: { title: "Writing", body: "Body", state: "active" } },
    availability: { contractDigest: surface.contractDigest, journeys: Object.fromEntries(surface.journeys.map(item =>
      [item.id, { dependenciesReady: true, blockers: [] }])) } });
  const panel = projectViewPanel(value, value.journeys[index]!, value.views.find(view => view.id === id)!,
    surface, store.get(), validate, scope);
  return `<script lang="ts">
    import Panel from '@desert/svelte/views/Panel.svelte';
    import AdaptiveSurfaceLayout from '@desert/svelte/pieces/AdaptiveSurfaceLayout.svelte';
    import { viewEventOwnership } from '@desert/web/client/view-events.ts';
    const initial=${JSON.stringify(panel)}, ownership=viewEventOwnership();
    let open=$state(false), generation=$state(0), value=$state('Writing'), accepted=$state(0), rejected=$state(0);
    let owner=$derived(ownership.sync([generation],true).panel);
    let current=$derived.by(()=>{
      const current=structuredClone(initial);
      if(current.frame.content.kind==='form') {
        current.frame.content.fields.find(field=>field.name==='title').value=value;
        const bound=current.body?.bindings.draft;
        if(bound?.kind==='form') bound.content.fields.find(field=>field.name==='title').value=value;
      }
      return {...current,owner};
    });
    function receive(envelope) {
      const event=ownership.read(envelope);
      if(!event) { rejected++; return; }
      if(event.kind==='input.change'&&event.name==='title') value=event.value;
      else if(event.kind==='transient.close'||event.kind==='surface.invoke'&&event.intent.kind==='close') open=false;
      else if(event.kind==='surface.invoke') accepted++;
    }
  </script>
  <AdaptiveSurfaceLayout>
    <button onclick={()=>{generation++;open=true;}}>Open fixture</button>
    <output data-writing>{value}</output><output data-accepted>{accepted}</output><output data-rejected>{rejected}</output>
    <Panel panel={open?current:null} onevent={receive}/>
  </AdaptiveSurfaceLayout>`;
}
