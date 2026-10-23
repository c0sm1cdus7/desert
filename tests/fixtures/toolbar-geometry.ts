export const toolbarGeometrySource = `<script lang="ts">
  import CatalogWorkspace from '@desert/svelte/catalog/compositions/catalog-workspace/CatalogWorkspace.svelte';
  import Drawer from '@desert/svelte/catalog/foundations/drawer/Drawer.svelte';
  import Problem from '@desert/svelte/catalog/compositions/problem/Problem.svelte';
  import DateControl from '@desert/svelte/catalog/foundations/date-control/DateControl.svelte';
  import Viewer from '@desert/svelte/catalog/compositions/viewer/Viewer.svelte';
  import Toolbar from '@desert/svelte/catalog/compositions/toolbar/Toolbar.svelte';
  import { SurfaceFrameVersion } from '@desert/interaction/surface-frame.ts';
  import {viewEventOwnership} from '@desert/web/client/view-events.ts';
  let task=$state(false), message=$state(false), viewer=$state(false), viewerIndex=$state(0), searching=$state(false), query=$state('');
  const frame={version:SurfaceFrameVersion,kind:'specimen',top:{title:'Task',subtitle:'The same toolbar geometry.'},
    content:{kind:'information',items:[{kind:'text',text:'Preserve shared buttons, material, and motion.'}]},bottom:{}};
  const date={version:'desert.control/1',kind:'date',id:'arrival',label:'Arrival',required:true,
    disabled:false,value:'2026-10-20'};
  const photos=[{source:'/sample.svg',alt:'First sample'},{source:'/sample.svg',alt:'Second sample'}];
  const resolved={view:{version:'desert.view/1',id:'geometry',outputs:[],content:
    Array.from({length:30},(_,index)=>({kind:'text',id:'reading-'+index,text:'Reading reference '+(index+1)}))},
    bindings:{},disabledOutputs:[],owner:viewEventOwnership().sync([],false).main};
</script>
<CatalogWorkspace navigationSurface={{title:'VOID',settingsPlaceholder:true}} title="Geometry" identity={{title:'Geometry',subtitle:'Approved page reference.'}}
  navigation={[{id:'home',label:'Home',icon:'open',group:'Explore'},{id:'notes',label:'Notes',icon:'create',group:'Explore'}]} active="home" {query} {searching}
  onsearch={()=>searching=true} oncancel={()=>searching=false} onquery={value=>query=value} onnavigate={()=>{}}
  content={{kind:'view-program',visited:[resolved],activeView:resolved.view.id,albums:{},onevent:()=>{},onalbum:()=>{},onactions:()=>{}}}
  searchContent={{kind:'catalog',title:'Geometry',description:'Search results stay in their overlay.',results:[],onselect:()=>{}}} />
  <div style="position:fixed;top:160px;right:18px;z-index:2;max-width:260px" data-test-controls>
    <div data-standalone-toolbar><Toolbar toolbar={{edge:'top',trailing:[{label:'Open task',icon:'open',state:'ready',intent:{kind:'journey',journey:'fixture-task'}}]}} invoke={()=>task=true} /></div>
    <button onclick={()=>message=true}>Open message</button>
    <button onclick={()=>viewer=true}>Open viewer</button>
    <DateControl node={date} onevent={()=>{}} />
  </div>
  <Drawer label="Task" {frame} open={task} onclose={()=>task=false} invoke={()=>{}} />
  <Problem open={message} title="Message" description="A shared surface." close={()=>message=false} />
  <Viewer items={photos.map(photo=>({kind:'image',...photo}))} title="Media" open={viewer} index={viewerIndex}
    onopen={value=>viewer=value} onindex={value=>viewerIndex=value} onreturn={()=>{}} />
`;
