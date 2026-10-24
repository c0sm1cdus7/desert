<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { ToolbarLayout } from "../../index.ts";
  import { SpeedDial } from "../../index.ts";
  import { Information } from "../../index.ts";
  import { ReadingContent } from "../../index.ts";
  import { StackLayout } from "../../index.ts";
  import { GroupedPanel } from "../../index.ts";
  import { DestinationRow } from "../../index.ts";
  import type { ToolbarAction } from "../../../../interaction/toolbar.ts";
  import { AccessAppearanceSpecimen } from "../../index.ts";
  import { ViewDestinationLink } from "../../index.ts";
  import { ConfirmationDialog } from "../../index.ts";
  import { Button } from "../../../vendor/components/ui/button/index.js";
  import { surfaceFrame,SurfaceFrameVersion } from "../../../../interaction/surface-frame.ts";
  import { ObjectStateControl } from "../../index.ts";
  import { ObjectStateRow } from "../../index.ts";
  import { ContextProperties } from "../../index.ts";
  import { AttentionIndicator } from "../../index.ts";
  import { AttentionList } from "../../index.ts";
  import { AttentionStatus } from '../../index.ts';
  import type {AttentionSignal} from '../../../../attention.ts';
  import { ReferenceSpecimen } from "../../index.ts";
  import { MediaReferenceSpecimen } from "../../index.ts";
  import { ContentFlow } from "../../index.ts";
  import { RelatedSelection } from "../../index.ts";
  import { SelectionField } from "../../index.ts";
  import { MeasuredField } from "../../index.ts";
  import type { ResolvedView } from "../../../../views/resolved.ts";
  import { ResolvedNodeVersion, type ResolvedNodeFor } from "../../../../interaction/resolved-node.ts";
  import type { RelatedSelectionSnapshot } from "../../../../interaction/related-selection.ts";
  import { Collection } from '../../index.ts';
  import { SummaryWidget } from '../../index.ts';
  import { SurfaceSpecimen } from '../../index.ts';
  import { Feedback } from '../../index.ts';
  let { owner }: CatalogProps<"shared-owner-specimen"> = $props();
  let open = $state(false), feedback = $state("Local example. No product changes.");
  let status=$state("open");
  let flowLayout=$state<'overview'|'gallery'>('overview');
  let commandState=$state('ready');
  let widgetState=$state('ready');
  let commandReason=$derived(commandState==='loading'?'Connecting to the controller…':commandState==='offline'?'Offline. Reconnect to use this action.':undefined);
  const gallery:ResolvedView={view:{version:'desert.view/1',id:'gallery-fixture',layout:'gallery',outputs:['open'],content:[
    {kind:'stack',id:'collections',title:'Collections',items:[{kind:'collection',id:'collection-grid',input:'collections',output:'open'}]},
    {kind:'stack',id:'media',title:'Media',items:[{kind:'collection',id:'media-grid',input:'media',output:'open'}]},
  ]},disabledOutputs:[],bindings:{
    collections:{version:ResolvedNodeVersion,kind:'collection',object:'collection',fields:['title'],labels:{'collection.title':'Title'},loaded:true,disabled:false,selectedId:null,
      presentation:{kind:'collection-grid',title:'title',previews:[{id:'travel',count:3},{id:'research',count:2}]},
      records:[{id:'travel',version:1,facts:{title:'Travel'}},{id:'research',version:1,facts:{title:'Research'}}]},
    media:{version:ResolvedNodeVersion,kind:'collection',object:'media',fields:['image'],labels:{'media.image':'Image'},loaded:true,disabled:false,selectedId:null,
      presentation:{kind:'media-grid',image:'image',layout:'grid'},
      records:[1,2,3].map(index=>({id:`image-${index}`,version:1,facts:{image:'/bank-image.svg'}}))},
  }};
  const attentionSignal:AttentionSignal={version:'desert.attention/1',recipient:'specimen',
    source:{kind:'activity',id:'10000000-0000-4000-8000-000000000001',revision:1,journey:'note'},
    target:{kind:'activity',id:'10000000-0000-4000-8000-000000000001'},reason:'activity.resume',resolution:'producer'};
  const widget:ResolvedNodeFor<'collection'>={version:ResolvedNodeVersion,kind:'collection',object:'task',fields:['status'],
    labels:{'task.status':'Status'},loaded:true,disabled:false,selectedId:null,
    presentation:{kind:'summary-widget',title:'Tasks',description:'Work at a glance',totalLabel:'Tasks',field:'status',
      segments:[{value:'open',label:'Open'},{value:'completed',label:'Completed'}]},
    records:[{id:'first',version:1,facts:{status:'open'}},{id:'second',version:1,facts:{status:'open'}},
      {id:'third',version:1,facts:{status:'completed'}}]};
  let shownWidget=$derived<ResolvedNodeFor<'collection'>>({...widget,loaded:widgetState!=='loading',
    ...(widgetState==='loading'?{records:[]}:{}),
    connection:widgetState==='offline'?'offline':widgetState==='loading'?'loading':'ready',
  });
  let relation=$state<RelatedSelectionSnapshot>({revision:0,busy:false,uncertain:false,dirty:false,committing:false,groups:[{input:"media",label:"Media in this collection",loading:false,busy:false,uncertain:false,
    items:[{id:"image",label:"Image 1",checked:true},{id:"video",label:"Video 2",checked:false},{id:"audio",label:"Audio 3",checked:false}]}]});
  const actions: readonly ToolbarAction[] = [
    {label:"Create note",icon:"create",state:"ready",intent:{kind:"journey",journey:"specimen.create"}},
    {label:"View options",icon:"review",state:"ready",intent:{kind:"journey",journey:"specimen.options"}},
  ];
  const confirmation = surfaceFrame({version:SurfaceFrameVersion,kind:"confirmation",top:{title:"Move note to Trash?"},content:{kind:"message",text:"You can restore the note from Trash."},bottom:{secondary:{label:"Cancel",icon:"back",state:"ready",intent:{kind:"back"}},primary:{label:"Move to Trash",icon:"archive",state:"ready",intent:{kind:"accept"}}}});
</script>
<div data-owner-specimen={owner} class="grid min-w-0 gap-4">
  {#if owner === "Place"}<SurfaceSpecimen />
  {:else if owner === "Flow"}
    <MeasuredField kind="control.select"><SelectionField selection="flow-example" label="Layout" value={flowLayout} fieldControl
      options={[{value:'overview',label:'Overview',disabled:false},{value:'gallery',label:'Gallery',disabled:false}]}
      onchange={value=>{if(value==='overview'||value==='gallery')flowLayout=value;}}/></MeasuredField>
    {#if flowLayout==='gallery'}<ContentFlow resolved={gallery} onevent={()=>feedback='Open media locally'}/>
    {:else}<ContentFlow resolved={{view:{version:'desert.view/1',id:'overview-fixture',layout:'overview',outputs:['tasks'],content:[{kind:'attention',id:'attention'},
    {kind:'stack',id:'widgets',title:'Widgets',items:[{kind:'collection',id:'task-summary',input:'task-summary',output:'tasks',
      presentation:{kind:'summary-widget',title:'Tasks',description:'Work at a glance',totalLabel:'Tasks'}}]}]},bindings:{'task-summary':widget},disabledOutputs:[],
    attention:{loaded:true,error:null,objectSignals:{},items:[{id:'draft',journey:'note',title:'Finish your note',description:'Continue where you left off.',available:true,signals:[attentionSignal]}]}}} onevent={event=>feedback=event.kind==='attention.resume'?'Resume locally':'Open the Tasks destination locally.'}/>{/if}
  {:else if owner === "SummaryWidget"}
    <MeasuredField kind="control.select"><SelectionField selection="widget-state" label="State" value={widgetState} fieldControl
      options={['ready','loading','offline'].map(value=>({value,label:value[0].toUpperCase()+value.slice(1),disabled:false}))} onchange={value=>widgetState=value} /></MeasuredField>
    <SummaryWidget node={shownWidget} activate={()=>feedback='Open the Tasks destination locally.'} />
  {:else if owner === "RelatedSelection"}<RelatedSelection state={relation} onevent={event=>{if(event.kind==='related.change')relation={...relation,groups:relation.groups.map(group=>({...group,items:group.items.map(item=>item.id===event.id?{...item,checked:event.checked}:item)}))};}}/>
  {:else if owner === "MediaReferenceSelector"}<MediaReferenceSpecimen />
  {:else if owner === "LabelRail" || owner === "ColorBullet" || owner === "ReferenceValues" || owner === "ReferenceSelector" || owner === "LabelsControl"}<ReferenceSpecimen {owner}/>
  {:else if owner === "AttentionList"}<AttentionList state={{loaded:true,error:null,objectSignals:{},items:[{id:"draft",journey:"note",title:"Finish your note",description:"Continue where you left off.",available:true,signals:[attentionSignal]},{id:"unavailable",journey:"note",title:"Saved activity",description:"This activity needs a compatible version.",available:false,signals:[{...attentionSignal,reason:'activity.compatibility'}]}]}} resume={id=>feedback=`Resume ${id} locally`} />
  {:else if owner === "AttentionStatus"}<AttentionStatus signals={[attentionSignal]} />
  {:else if owner === "ObjectStateControl"}<ObjectStateControl selectors={[{field:"status",label:"Status",value:status,disabled:false,options:[{value:"open",label:"Open",journey:"open",available:true},{value:"completed",label:"Completed",journey:"completed",available:true}]}]} onselect={value=>status=value} />
  {:else if owner === "ContextProperties"}<ContextProperties fields={['projects']} facts={{projects:['design','research']}} object="task" labels={{'task.projects':'Projects'}}
    references={{projects:[{value:'design',label:'Design',color:'violet'},{value:'research',label:'Research',color:'green'}]}}
    selectors={[{field:'status',label:'Status',value:status,disabled:false,options:[{value:'open',label:'Open',journey:'open',available:true},{value:'completed',label:'Completed',journey:'completed',available:true}]}]}
    onselect={value=>status=value}/>
  {:else if owner === "ObjectStateRow"}<dl class="bank-stack material-pane"><ObjectStateRow selector={{field:'status',label:'Status',value:status,disabled:false,options:[{value:'open',label:'Open',journey:'open',available:true},{value:'completed',label:'Completed',journey:'completed',available:true}]}} onselect={value=>status=value}/></dl>
  {:else if owner === "AttentionIndicator"}<AttentionIndicator required /><Information items={[{kind:"text",text:"Requires attention. The same amber indicator appears in Home and every presentation of the object. Reduced motion keeps it steady."}]} />
  {:else if owner === "AppearancePreferences" || owner === "AppearancePreview" || owner === "SeedAvatar" || owner === "AvatarShuffle" || owner === "Wallpaper" || owner === "AccessExperience" || owner === "LockScreen"}
    <AccessAppearanceSpecimen {owner} />
  {:else if owner === "ViewDestinationLink"}
    <MeasuredField kind="control.select"><SelectionField selection="action-row-state" label="State" value={commandState} fieldControl
      options={['ready','loading','offline'].map(value=>({value,label:value[0].toUpperCase()+value.slice(1),disabled:false}))} onchange={value=>commandState=value} /></MeasuredField>
    <StackLayout title="Objects"><Collection node={{version:ResolvedNodeVersion,kind:'collection',object:'note',fields:['title','details'],
      labels:{'note.title':'Title','note.details':'Details'},loaded:true,disabled:false,selectedId:null,
      records:[{id:'one-line',version:1,facts:{title:'Design ideas',details:''}},
        {id:'two-lines',version:1,facts:{title:'Next steps',details:'Only show secondary content when it exists.'}}]}}
      select={()=>feedback='Open the selected object locally.'}/></StackLayout>
    <StackLayout title="Actions"><ViewDestinationLink view="notes" output="trash" label="Trash" icon="archive" available={commandState==='ready'} reason={commandReason} onevent={()=>feedback="Open Trash from content, not the toolbar."} />
      {#if commandReason}<Feedback text={commandReason} />{/if}
    </StackLayout>
  {:else if owner === "ConfirmationDialog"}
    <Button variant="secondary" wrap onclick={()=>open=true}>Move note to Trash</Button>
    {#if confirmation.kind === "confirmation"}<ConfirmationDialog frame={confirmation} {open} locked={false} invoke={intent=>{feedback=intent.kind==="accept"?"Confirmed locally":"Cancelled";open=false;}} onclosed={()=>{}} />{/if}
  {:else if owner === "ToolbarLayout"}
    <ToolbarLayout identity={{title:"Notes",subtitle:"Your private notes."}} content={{kind:"place-navigation",detail:true,onback:()=>feedback="Back",topActions:actions,invoke:()=>feedback="Command activated"}} />
  {:else if owner === "SpeedDial"}<SpeedDial {actions} {open} onchange={value=>open=value} invoke={()=>feedback="Command activated"} />
  {:else if owner === "ReadingContent"}<ReadingContent fields={["content"]} facts={{content:"Reading content remains a readable paragraph, separate from right-aligned properties."}} object="note" labels={{"note.content":"Content"}} />
  {:else if owner === "InspectionCatalog"}
    <StackLayout title="Foundations"><GroupedPanel><div data-grouped-rows><DestinationRow destination="fact" label="Fact" icon="catalog" available open={()=>feedback="Open the Fact component from the index to inspect every declared state."} /><DestinationRow destination="action" label="Button" icon="catalog" available open={()=>feedback="Open the Button component from the index."} /></div></GroupedPanel></StackLayout>
  {:else}
    <Information items={[
      {kind:"fact",label:"Display name",value:"Franco"},
      {kind:"fact",label:"Identity",value:"franco"},
      {kind:"fact",label:"Role",value:"Administrator with a long value that wraps within its right-aligned column"},
      {kind:"fact",label:"Known empty",value:""},
      {kind:"fact",label:"Unknown",value:null},
    ]} />
  {/if}
  <StackLayout title="Interaction"><Information items={[{kind:"text",text:feedback}]} /></StackLayout>
</div>
