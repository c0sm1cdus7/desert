import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

export const catalogSource = {
  "root.product.ts": 'import { composeProduct } from "desert-sdk/src/index.ts"; import { Modules } from "./modules.ts"; export const Product = composeProduct({ modules: Modules });',
  "modules.ts": 'import { moduleIndex as catalog } from "desert-sdk/src/index.ts"; import { NotesModule } from "./modules/notes/notes.module.ts"; const mounted = catalog([NotesModule]); export const Modules = mounted; export const Views = Modules.views; export const Journeys = Modules.journeys; export const Commands = Modules.commands;',
  "modules/notes/notes.module.ts": 'import { defineModule } from "desert-sdk/src/index.ts"; import { NotesView } from "./views/notes.view.ts"; export const NotesModule = defineModule({ id: "notes", views: [NotesView], exports: { views: { Notes: NotesView } } });',
  "modules/notes/views/notes.view.ts": 'export const NotesView = { version: "desert.view/1", id: "notes", content: [] } as const;',
} as const;

export async function sourceFixture(files: Record<string, string>, run: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "desert-catalog-source-"));
  try {
    for (const [name, source] of Object.entries(files)) {
      await mkdir(dirname(join(root, name)), { recursive: true });
      await writeFile(join(root, name), source);
    }
    await run(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}
