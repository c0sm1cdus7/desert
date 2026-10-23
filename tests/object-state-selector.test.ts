import test from "node:test";
import assert from "node:assert/strict";
import { objectSelectors } from "../src/web/client/object-selectors.ts";
import { projectView } from "../src/web/client/view-projection.ts";
import { humanState } from "../src/web/client/state.ts";
import { readModelScope } from "../src/web/client/model-scope.ts";
import { resolvedPublicationIssue } from "../src/views/publication-semantics.ts";
import { program, surface } from "./fixtures/view-program.ts";
import { Note, ArchiveNote, ReadNote } from "./fixtures/notebook-domain.ts";
import type { ViewProgram } from "../src/views/program-schema.ts";

const selection = {fact:{object:"note",field:"state"},value:"archived",label:"Archived"};
const publication = {object:"note",view:"detail",title:{object:"note",field:"title"},actions:[{journey:ArchiveNote.id,icon:"archive" as const,selection}]};

test("A state choice must correspond to an actual input-free canonical transition",()=>{
  assert.equal(resolvedPublicationIssue(Note,publication,[ArchiveNote]),undefined);
  assert.equal(resolvedPublicationIssue(Note,{...publication,actions:[{...publication.actions[0]!,selection:{...selection,value:"active"}}]},[ArchiveNote]),"INVALID_SELECTION_COMMAND");
});

test("State controls reuse offers, remain inside the object and never duplicate toolbar actions",()=>{
  const scoped = readModelScope(surface,{read:ReadNote.id,creations:[],subjectActions:[ArchiveNote.id]});
  const store = humanState(surface,scoped);
  store.update({view:"detail",selectedId:"note-one",detail:{id:"note-one",version:2,facts:{title:"Example",body:"",state:"active"}},
    availability:{contractDigest:surface.contractDigest,journeys:{[ArchiveNote.id]:{dependenciesReady:true,blockers:[]}}},
    offers:{[ArchiveNote.id]:{journeyId:ArchiveNote.id,subject:"note-one",version:2,eligible:true}}});
  const definition = {...program,objects:[publication],journeys:[...program.journeys,
    {id:ArchiveNote.id,kind:"action",source:ReadNote.id,outputs:[]}]} as ViewProgram;
  const selectors = objectSelectors(definition,"detail",surface,store.get(),scoped);
  assert.equal(selectors[0]?.value,"active"); assert.equal(selectors[0]?.options[0]?.available,true);
  const view = projectView(definition,program.journeys[1],program.views[2],surface,store.get(),()=>true,scoped);
  assert.equal(view.top?.trailing?.some(item=>item.label==="Archive note"),false);
  assert.equal(view.bindings.detail?.kind,"context");
  assert.equal(view.bindings.detail.content.details.fields.includes("state"),false);
  const list = projectView(definition,program.journeys[1],program.views[1],surface,store.get(),()=>true,scoped);
  const collection = Object.values(list.bindings).find(node=>node.kind==="collection");
  assert.equal(collection?.kind,"collection");
  if (collection?.kind === "collection" && collection.fields.includes("state")) {
    assert.equal(collection.valueLabels?.state?.archived,"Archived");
  }
  store.update({uncertain:true});
  assert.equal(objectSelectors(definition,"detail",surface,store.get(),scoped)[0]?.disabled,true);
  store.update({uncertain:false,offers:{[ArchiveNote.id]:{journeyId:ArchiveNote.id,subject:"other-note",version:2,eligible:true}}});
  assert.equal(objectSelectors(definition,"detail",surface,store.get(),scoped)[0]?.options[0]?.available,false);
});
