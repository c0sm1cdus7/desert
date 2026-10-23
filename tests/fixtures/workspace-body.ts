import type { ViewContent } from "../../src/views/schema.ts";

/** Resolved test data through the same finite workspace body as the product. */
export function workspaceBodySource(content: readonly ViewContent[] = []) {
  return `import { viewEventOwnership } from '@desert/web/client/view-events.ts';
    const owners = viewEventOwnership().sync(['workspace-fixture'], true);
    const fixtureView = { owner:owners.main, view:{version:'desert.view/1',id:'fixture',content:${JSON.stringify(content)}},
      bindings:{}, disabledOutputs:[] };
    const workspaceBody = {kind:'view-program',visited:[fixtureView],activeView:'fixture',albums:{},
      onevent:()=>{},onalbum:()=>{},onactions:()=>{}};`;
}
