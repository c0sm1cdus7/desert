import { posix } from "node:path";
import type { WebCatalogDefinition } from "../../svelte/catalog-manifest-schema.ts";

const header = "// Generated from catalog-manifest.ts. Run scripts/web-catalog.ts --write; do not edit.\n";
const request = (source: string) => `./${posix.relative("src/svelte", source)}`;

/** Separate derived modules preserve the existing import graph: the bank does
 * not import its own dispatcher through a combined runtime component barrel. */
export function deriveWebCatalog(manifest: WebCatalogDefinition): readonly { path: string; source: string }[] {
  const owners = Object.entries(manifest.owners);
  const bank = owners.filter(([, owner]) => owner.bank?.length);
  const adapters = owners.filter(([, owner]) => Object.keys(owner.adapters ?? {}).length);
  const registry = [header + 'import type { NodeRendererTable } from "./renderer-contracts.ts";',
    ...bank.map(([name, owner]) => `import ${name} from ${JSON.stringify(request(owner.source))};`),
    "", "export const nodeRenderers: NodeRendererTable = Object.freeze({",
    ...bank.flatMap(([name, owner]) => owner.bank!.map(id => `  ${/^[a-z]+$/.test(id) ? id : JSON.stringify(id)}: ${name},`)),
    "} satisfies NodeRendererTable);", ""].join("\n");
  const gateway = [header + 'import type { AdapterComponent } from "./adapter-contract.ts";',
    ...adapters.map(([name, owner]) => `import ${name}Owner from ${JSON.stringify(request(owner.source))};`), "",
    ...adapters.flatMap(([name, owner]) => Object.keys(owner.adapters!).map(entry =>
      `export const ${entry}: AdapterComponent<${JSON.stringify(entry)}> = ${name}Owner;`)), ""].join("\n");
  const types = [header.trimEnd(),
    ...adapters.map(([name, owner]) => `import type ${name}Owner from ${JSON.stringify(request(owner.source))};`),
    "", "export type Owners = {",
    ...adapters.flatMap(([name, owner]) => Object.keys(owner.adapters!).map(entry => `  ${entry}: typeof ${name}Owner;`)),
    "};", ""].join("\n");
  return [
    { path: "src/svelte/renderer-registry.ts", source: registry },
    { path: "src/svelte/adapter-catalog.ts", source: gateway },
    { path: "src/svelte/catalog-owner-types.ts", source: types },
  ];
}
