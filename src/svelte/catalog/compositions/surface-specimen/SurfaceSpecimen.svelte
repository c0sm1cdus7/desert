<script lang="ts">
  import { Information, Modal, StackLayout, SurfaceFrame } from '../../index.ts';
  import { surfaceFrame, SurfaceFrameVersion } from '../../../../interaction/surface-frame.ts';
  import { transientFrame } from '../../../../interaction/transient-frame.ts';
  import type { ResolvedView } from '../../../../views/resolved.ts';
  import { say } from '../../../infra/messages.ts';
  import { m } from '../../../../messages/keys.ts';
  let open = $state(false);
  let modal = $state<ReturnType<typeof Modal>>();
  const anatomy = [
    { kind: 'fact', label: say(m.surfaceSpecimen.edges), value: say(m.surfaceSpecimen.toolbars) },
    { kind: 'fact', label: say(m.surfaceSpecimen.sides), value: say(m.surfaceSpecimen.rootSurfaces) },
    { kind: 'fact', label: say(m.surfaceSpecimen.content), value: say(m.surfaceSpecimen.contentOrder) },
  ] as const;
  // The transient the example launches: its own content and toolbars, closed by its Close or by dismissal.
  const child = transientFrame(surfaceFrame({ version: SurfaceFrameVersion, kind: 'specimen',
    top: { title: say(m.surfaceSpecimen.mountedTitle), subtitle: say(m.surfaceSpecimen.mountedSubtitle) },
    content: { kind: 'information', items: [{ kind: 'text', text: say(m.surfaceSpecimen.mountedText) }] }, bottom: {} }), false);
  const example = surfaceFrame({ version: SurfaceFrameVersion, kind: 'specimen',
    top: { title: say(m.surfaceSpecimen.exampleTitle), subtitle: say(m.surfaceSpecimen.exampleSubtitle) },
    content: { kind: 'information', items: anatomy }, bottom: {} });
  const body: ResolvedView = { view: { version: 'desert.view/1', id: 'surface-example', outputs: ['open-transient'], content: [
    { kind: 'stack', id: 'anatomy', title: say(m.surfaceSpecimen.anatomy), items: anatomy },
    { kind: 'stack', id: 'actions', title: say(m.surfaceSpecimen.actions), items: [
      { kind: 'destination-link', id: 'open-transient', output: 'open-transient', label: say(m.surfaceSpecimen.openTransient), icon: 'open' },
    ] },
  ] }, bindings: {}, disabledOutputs: [] };
  function close() { modal?.noteInvocation('close'); open = false; }
</script>

<SurfaceFrame frame={example} {body} invoke={() => open = true} />
<Modal bind:this={modal} label={say(m.surfaceSpecimen.mountedTitle)} {open} locked={false} presentation="transient" ondismiss={close}>
  <SurfaceFrame frame={child} presentation="transient" invoke={close} />
</Modal>
<StackLayout title={say(m.surfaceSpecimen.rules)}><Information items={[
  { kind: 'text', text: say(m.surfaceSpecimen.rulesMounted) },
  { kind: 'text', text: say(m.surfaceSpecimen.rulesAuthoring) },
]} /></StackLayout>
