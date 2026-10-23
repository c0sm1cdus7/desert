<script lang="ts">
  import SurfaceFrame from '../surface-frame/SurfaceFrame.svelte';
  import Drawer from '../../foundations/drawer/Drawer.svelte';
  import StackLayout from '../../foundations/stack-layout/StackLayout.svelte';
  import Information from '../information/Information.svelte';
  import { surfaceFrame, SurfaceFrameVersion } from '../../../../interaction/surface-frame.ts';
  import type { ResolvedView } from '../../../../views/resolved.ts';
  let open=$state(false);
  const child=surfaceFrame({version:SurfaceFrameVersion,kind:'specimen',
    top:{title:'Mounted surface',subtitle:'Content and toolbars; no lateral child surfaces.'},
    content:{kind:'information',items:[{kind:'text',text:'This transient belongs to the launching surface. Close returns focus to its command.'}]},bottom:{}});
  const example=surfaceFrame({version:SurfaceFrameVersion,kind:'specimen',
    top:{title:'Surface content',subtitle:'The same toolbar and content owners used by every mounted surface.'},
    content:{kind:'information',items:[
      {kind:'fact',label:'Top and bottom',value:'Toolbars'},
      {kind:'fact',label:'Left and right',value:'Surfaces at the root only'},
      {kind:'fact',label:'Content',value:'Header → Stack → Title + Stack content'},
    ]},bottom:{}});
  const body:ResolvedView={view:{version:'desert.view/1',id:'surface-example',outputs:['open-transient'],content:[
    {kind:'stack',id:'anatomy',title:'Anatomy',items:[
      {kind:'fact',label:'Top and bottom',value:'Toolbars'},
      {kind:'fact',label:'Left and right',value:'Surfaces at the root only'},
      {kind:'fact',label:'Content',value:'Header → Stack → Title + Stack content'},
    ]},
    {kind:'stack',id:'actions',title:'Actions',items:[
      {kind:'destination-link',id:'open-transient',output:'open-transient',label:'Open transient',icon:'open'},
    ]},
  ]},bindings:{},disabledOutputs:[]};
</script>

<SurfaceFrame frame={example} {body} invoke={()=>open=true} />
<Drawer label="Mounted surface" {open} frame={child} presentation="transient"
  onclose={()=>open=false} invoke={()=>open=false} />
<StackLayout title="Composition rules"><Information items={[
  {kind:'text',text:'The main surface owns content and its docking areas. Top and bottom accept only toolbars; left and right accept surfaces. A mounted surface owns content and toolbars, never another left or right surface.'},
  {kind:'text',text:'Current authoring admits a left navigation surface; the runtime may dock an object context on the right when space allows. Arbitrary right-dock View composition is not installed.'},
]} /></StackLayout>
