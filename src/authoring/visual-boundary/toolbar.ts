import { posix } from 'node:path';
import { parse } from 'svelte/compiler';
import ts from 'typescript';
import { walk, type SyntaxNode } from './walk.ts';
import { assertIndirectToolbarCss } from './toolbar-css.ts';
import { cssProperty, cssDeclarationProperty, decodeCss, isToolbarGeometry } from './toolbar-properties.ts';

type Source=Readonly<{path:string;source:string}>;
const owner='src/svelte/catalog/compositions/toolbar-layout/ToolbarLayout.svelte';
const material='src/svelte/catalog/compositions/toolbar-layout/toolbar-layout.css';
const identityOwner='src/svelte/catalog/compositions/toolbar-layout/ToolbarIdentity.svelte';
const readingOwner='src/svelte/catalog/mechanisms/surface-reading/surface-reading.css';
const target=/(?:\.(?:workspace-header|bank-footer|sidebar-toolbar|toolbar-row|toolbar-action|toolbar-heading|toolbar-title|toolbar-subtitle)\b|\[data-(?:piece\s*=\s*["']?toolbar|toolbar(?:\]|=|-(?:controls|utilities|navigation|auxiliary|heading|identity|leading|title|subtitle)\b)|identity-(?:title|subtitle)\b|product-name\b|(?:catalog|place)-toolbar(?:\]|=)|catalog-navigation-actions\b))/;
const variable=/^--(?:toolbar-|catalog-toolbar-)/;
const readingVariable=/^--(?:surface-reading-inset|navigation-(?:group|row)-inset)$/;

/** Direct source boundary: callers cannot supply visual attributes or redefine
 * toolbar metrics. This does not claim arbitrary CSS/callback information-flow. */
export function assertCanonicalToolbarOwnership(sources:readonly Source[]):void {
  const completeProfile = assertIndirectToolbarCss(sources);
  for(const {path,source} of sources){
    if(!/\.(svelte|css)$/.test(path)) continue;
    const fail=(reason:string):never=>{throw new Error(`TOOLBAR_OWNERSHIP: ${path}: ${reason}`);};
    const text=path.endsWith('.css')?`<style>${source}</style>`:source;
    const tree=parse(text,{modern:true});
    if(path!==material) walk(tree.css,node=>{
      if(node.type==='Declaration' && variable.test(cssDeclarationProperty(node,text))) fail(`inherited geometry ${node.property}`);
      if(path!==readingOwner&&node.type==='Declaration'&&readingVariable.test(cssDeclarationProperty(node,text))) fail(`inherited reading guide ${node.property}`);
      if(completeProfile || node.type!=='Rule') return;
      const prelude=node.prelude as SyntaxNode;
      const selector=decodeCss(text.slice(Number(prelude.start),Number(prelude.end)));
      // A toolbar used only as a preceding sibling is not the styled subject.
      const subject=selector.slice(Math.max(selector.lastIndexOf('+'),selector.lastIndexOf('~'))+1);
      if(!target.test(subject)) return;
      const block=node.block as {children:SyntaxNode[]};
      for(const declaration of block.children) if(declaration.type==='Declaration'&&isToolbarGeometry(cssDeclarationProperty(declaration,text)))
        fail(`consumer geometry ${declaration.property} on ${selector}`);
    });
    if(path.endsWith('.css')) continue;
    const components=new Set<string>();
    for(const block of [tree.instance,tree.module]){
      if(!block) continue;
      const content=block.content as unknown as {start:number;end:number};
      const script=text.slice(content.start,content.end);
      const file=ts.createSourceFile(path,script,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
      const inspect=(node:ts.Node):void=>{
        if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='setProperty'
          &&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])&&(variable.test(node.arguments[0].text)||readingVariable.test(node.arguments[0].text))) fail('scripted inherited geometry');
        if(path===owner&&ts.isVariableDeclaration(node)&&ts.isObjectBindingPattern(node.name))
          for(const item of node.name.elements) if(item.dotDotDotToken||/^(?:class|style)$/.test((item.propertyName??item.name).getText(file))) fail('open visual input');
        ts.forEachChild(node,inspect);
      };
      inspect(file);
      for(const statement of file.statements){
        if(!ts.isImportDeclaration(statement)||!ts.isStringLiteral(statement.moduleSpecifier)) continue;
        const specifier=statement.moduleSpecifier.text;
        const resolved=specifier.startsWith('.')?posix.normalize(posix.join(posix.dirname(path),specifier)):specifier;
        if(resolved===owner&&statement.importClause?.name) components.add(statement.importClause.name.text);
        if(resolved===identityOwner&&path!==owner) fail('identity must be supplied as toolbar data');
      }
      if(path===owner && /\b(?:HTMLAttributes|HTMLProps|ComponentProps)\b|\bclass\s*:|\bstyle\s*:|\.\.\.\s*\w+/.test(script))
        fail('open native attribute contract');
    }
    walk(tree.fragment,node=>{
      if(node.type==='CallExpression'){
        const callee=node.callee as {property?:{name?:string}};
        const first=(node.arguments as {value?:unknown}[])[0];
        if(callee?.property?.name==='setProperty'&&typeof first?.value==='string'&&(variable.test(first.value)||readingVariable.test(first.value))) fail('inline scripted geometry');
      }
      if(node.type==='StyleDirective'&&(variable.test(String(node.name))||readingVariable.test(String(node.name)))) fail('inline inherited geometry');
      if(node.type==='Attribute'&&(variable.test(String(node.name))||readingVariable.test(String(node.name))||node.name==='style'&&/--(?:toolbar-[\w-]+|catalog-toolbar-[\w-]+|surface-reading-inset|navigation-(?:group|row)-inset)\s*:/.test(text.slice(Number(node.start),Number(node.end))))) fail('inline inherited geometry');
      if(path===owner && node.type==='SpreadAttribute') fail('native attribute spread');
      if(node.type!=='Component'||!components.has(String(node.name))) return;
      const inspectContent=(value:unknown):void=>{
        if(!value||typeof value!=='object')return;
        const part=value as SyntaxNode;
        if(part!==node&&part.type==='Component')return;
        if(part.type==='RegularElement'&&/^(button|a|input|select|textarea)$/.test(String(part.name)))return;
        if(part.type==='RegularElement'&&/^(h[1-6]|span|p)$/.test(String(part.name)))fail('raw identity markup; use identity data');
        if(part.type==='Text'&&String(part.data??'').trim())fail('raw toolbar text; use identity data');
        for(const [key,child] of Object.entries(part))if(!['attributes','expression','metadata'].includes(key)){
          if(Array.isArray(child))for(const item of child)inspectContent(item);else inspectContent(child);
        }
      };
      inspectContent(node);
      for(const attribute of node.attributes as SyntaxNode[]){
        const name=String(attribute.name);
        if(attribute.type==='SpreadAttribute'||['StyleDirective','ClassDirective'].includes(String(attribute.type))||/^(?:class|style|--|data-)/.test(name))
          fail(`caller visual attribute ${name}`);
      }
    });
  }
}
