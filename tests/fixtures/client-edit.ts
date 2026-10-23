import type { TestContext } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { compile } from '../../src/compile.ts';
import { updateCommand, fromInput } from '../../src/commands.ts';
import { mutationJourney } from '../../src/journeys.ts';
import { humanProduct } from '../../src/web/client/model.ts';
import { webTransport } from '../../src/web/client/transport.ts';
import { blockedSnapshot } from '../../src/web/client/connection.ts';
import { presentFrame } from '../../src/web/client/frame.ts';
import type { HumanSurface, Mutation } from '../../src/web/types.ts';
import { Notebook, NotebookViewProgram } from '../../products/notebook/product.ts';
import { CreateNote, ReadNote } from '../../products/notebook/journeys.ts';
import { readScopes } from '../../src/web/client/view-scopes.ts';
import { compileViewProgram } from '../../src/views/program.ts';
import { Note } from '../../products/notebook/note.ts';
import { NotesController } from '../../products/notebook/dependencies.ts';

export async function until(predicate: () => boolean) {
  for (let retry = 0; retry < 200; retry++) { if (predicate()) return; await delay(10); }
  throw new Error('CLIENT_EDIT_EXPECTATION_TIMEOUT');
}

export async function clientEditFixture(t: TestContext, commit: 'submit' | 'review' = 'submit') {
  const edit = mutationJourney('revise-entry', updateCommand('replace-entry-text', Note, {
    input: ['title', 'body'], when: { state: 'active' }, set: { title: fromInput('title'), body: fromInput('body') },
  }), { controller: NotesController, dependencies: [] });
  const definition = structuredClone(Notebook);
  const application = compile({ ...definition, journeys: [...definition.journeys, edit],
    surfaces: definition.surfaces.map(surface => surface.kind === 'human' ? { ...surface,
      journeys: [...surface.journeys, edit.id],
      commit: { ...surface.commit, [edit.id]: commit },
      language: { ...surface.language, journeys: { ...surface.language.journeys, [edit.id]: 'Edit entry' } },
    } : surface),
  });
  const surface = application.surface('human') as HumanSurface;
  const validate = (id: string, input: unknown) => application.validateInput(id, input).valid;
  const create = NotebookViewProgram.journeys.find(journey => journey.id === CreateNote.id);
  if (create?.kind !== 'create') throw new Error('NOTEBOOK_CREATE_EXPERIENCE_REQUIRED');
  const initialize = [
    { input: "title", fact: "title" }, { input: "body", fact: "body" },
  ];
  const program = compileViewProgram({ ...NotebookViewProgram,
    journeys: [...NotebookViewProgram.journeys, { id: edit.id, kind: 'update', source: ReadNote.id,
      view: create.view, preferredDock: 'right', initialize, outputs: create.outputs }],
    objects: NotebookViewProgram.objects!.map(object => ({ ...object, actions: [...object.actions, { journey: edit.id, icon: 'edit' }] })),
  }, surface);
  const scope = readScopes(program, surface).find(scope => scope.read.id === ReadNote.id)!;
  const model = humanProduct(surface, validate, { scope, initialize: { [edit.id]: initialize },
    transport: webTransport(surface.contractDigest, { kind: 'developer' }) });
  const mutation = surface.journeys.find(journey => journey.id === edit.id) as Mutation;
  const ready = { contractDigest: surface.contractDigest, journeys: Object.fromEntries(surface.journeys.map(journey =>
    [journey.id, { dependenciesReady: true, blockers: [] }])) };
  const control = { connected: true, eligible: true, readVisible: true, offerVersion: null as number | null,
    lostAcceptance: false, prepareError: null as string | null,
    beforePrepare: null as (() => Promise<void>) | null, beforeAccept: null as (() => Promise<void>) | null,
    record: { id: 'selected-record', version: 1, facts: { title: 'Original title', body: 'Original body', state: 'active' } } };
  const calls: { operation: string; body: Record<string, unknown> }[] = [];
  let preparedInput = {}, receipt: unknown = null;
  t.mock.method(globalThis, 'fetch', async (url: string, init?: RequestInit) => {
    const operation = url.split('/').at(-1)!;
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
    calls.push({ operation, body });
    let result: unknown;
    if (operation === 'availability') result = { snapshot: control.connected ? ready : blockedSnapshot(surface, 'unreachable'), validForMs: 1000 };
    else if (operation === 'begin') result = { id: 'edit-run' };
    else if (operation === 'read') result = control.readVisible ? [control.record] : [];
    else if (operation === 'offer') result = { journeyId: body.journeyId, subject: control.record.id,
      version: control.offerVersion ?? control.record.version, eligible: control.eligible };
    else if (operation === 'prepare') {
      await control.beforePrepare?.();
      if (control.prepareError) return new Response(JSON.stringify({ error: control.prepareError }), { status: 409 });
      preparedInput = body.input as Record<string, string>;
      result = { id: 'edit-intent', runId: 'edit-run', journeyId: edit.id,
        object: { id: control.record.id, type: 'note', expectedVersion: control.record.version },
        confirmationDigest: 'edit-confirmation', facts: { ...control.record.facts, ...preparedInput } };
    } else if (operation === 'accept') {
      await control.beforeAccept?.();
      control.record = { ...control.record, version: control.record.version + 1, facts: { ...control.record.facts, ...preparedInput } };
      receipt = { id: 'edit-intent', runId: 'edit-run', commandId: edit.command.id, status: 'completed',
        object: { id: control.record.id, type: 'note', version: control.record.version } };
      if (control.lostAcceptance) throw new Error('Lost response after commit');
      result = receipt;
    } else if (operation === 'receipt') result = receipt;
    else throw new Error(`Unexpected operation ${operation}`);
    return new Response(JSON.stringify(result));
  });
  await model.start(); await until(() => model.snapshot().loaded); await model.select(control.record.id);
  return { model, surface, scope, mutation, control, calls, frame: () => presentFrame(surface, model.snapshot(), validate, scope),
    writes: () => calls.filter(call => ['prepare', 'accept'].includes(call.operation)) };
}
