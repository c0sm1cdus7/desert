import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const hash = (content: string | Buffer) => createHash("sha256").update(content).digest("hex");
const read = (root: string, path: string) => readFileSync(join(root, path), "utf8");

function sourceBook(root: string, title: string, files: string[]) {
  return `# ${title}\n\nGenerated from this bundle's source. Do not edit this snapshot.\n` +
    `Regenerate with npm run authoring:generate; npm run authoring:check detects drift.\n` +
    `Paths below are relative to the SDK root. Read imports/types together; these are\n` +
    `verbatim modules, not standalone snippets or a published package API.\n\n` +
    files.map(path => `- ${path}`).join("\n") + "\n\n" + files.map(path => {
      const content = read(root, path);
      const language = path.endsWith(".svelte") ? "svelte" : "ts";
      return `## ${path}\n\nSource SHA-256: ${hash(content)}\n\n\`\`\`${language}\n${content.trimEnd()}\n\`\`\`\n`;
    }).join("\n");
}

function documentBook(root: string, title: string, files: string[]) {
  return `# ${title}\n\nGenerated from the bundled SDK documentation; do not edit this snapshot.\n\n` +
    files.map(path => {
      const content = read(root, path);
      const portable = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, target: string) =>
        /^(https?:|#)/.test(target) ? match : `${label} (SDK file: \`${join(dirname(path), target)}\`)`);
      return `## Source: ${path}\n\nSource SHA-256: ${hash(content)}\n\n${portable}`;
    }).join("\n");
}

export function generatedReferences(root = sourceRoot) {
  const index = read(root, "src/index.ts");
  const exports = [...index.matchAll(/from "\.\/(.+?)"/g)].map(match => `src/${match[1]}`);
  const api = [...new Set(["src/index.ts", ...exports, "src/program-grammar.ts", "src/validation.ts",
    "src/local.ts", "src/local/controller.ts", "src/local/session.ts", "src/local/identity.ts",
    "src/web/build.ts"])];
  const notebook = ["note", "dependencies", "commands", "journeys", "surfaces", "product", "distributions", "inspect", "local", "run-local", "build-web", "check-web", "run-web", "verify"]
    .map(name => `products/notebook/${name}.ts`);
  return {
    "api.md": sourceBook(root, "Real DESERT API and runtime grammar", api),
    "notebook.md": sourceBook(root, "Complete executable Notebook source", notebook),
    "public-catalog.md": sourceBook(root, "Experimental public catalogs and portable renderer contracts", [
      "products/landmarks/product.ts", "products/landmarks/exercises.ts", "products/landmarks/reference.ts",
      "products/landmarks/build-web.ts", "products/landmarks/run-web.ts",
      "src/public-catalog/index.ts", "src/public-catalog/authoring.ts", "src/public-catalog/schema.ts",
      "src/public-catalog/validate-definition.ts", "src/public-catalog/compile.ts", "src/public-catalog/surface.ts",
      "src/public-catalog/node-schema.ts", "src/public-catalog/events.ts", "src/public-catalog/reducer.ts",
      "src/public-catalog/project.ts", "src/public-catalog/exercises.ts", "src/public-catalog/draft.ts",
      "src/public-catalog/capabilities.ts", "src/public-catalog/protocol.ts", "src/public-catalog/client.ts",
      "src/build/public-catalog/build.ts", "src/build/public-catalog/manifest.ts",
      "src/build/public-catalog/assets.ts", "src/build/public-catalog/serve.ts", "src/build/public-catalog/renditions.ts",
      "src/svelte/pieces/media/source.ts", "src/svelte/pieces/media/Image.svelte",
      "src/svelte/pieces/media/PhotoCollection.svelte", "src/svelte/pieces/media/Viewer.svelte",
      "src/svelte/pieces/media/gestures.ts",
      "src/svelte/explorer/PublicCatalogProduct.svelte", "src/svelte/explorer/LocalExercises.svelte",
      "src/svelte/explorer/CatalogCard.svelte", "src/svelte/explorer/CatalogToolbar.svelte",
      "src/svelte/explorer/PublicCatalogBank.svelte", "src/svelte/explorer/PublicCatalogBank-model.ts",
    ]),
    "support.md": documentBook(root, "Supported behavior and evidence", ["docs/STATUS.md"]),
    "runtime.md": documentBook(root, "Runtime, authority and stack", ["docs/STACK.md", "docs/NATIVE-RENDERER-MAPPING.md", "docs/LOCAL-CONTROLLER.md"]),
    "distributions.md": documentBook(root, "Building supported distributions", ["docs/DISTRIBUTION-BUILDS.md"]) + "\n" +
      sourceBook(root, "Distribution build entrypoints", ["src/build/index.ts", "src/build/serve.ts", "src/build/manifest.ts",
        "src/build/svelte/template/src/routes/+page.svelte"]),
    "testing.md": documentBook(root, "Derived local verification", ["docs/DERIVED-VERIFICATION.md"]) + "\n" +
      sourceBook(root, "Testing entrypoints and contracts", ["src/testing/index.ts", "src/testing/types.ts",
        "src/testing/postgres.ts", "products/notebook/verify.ts"]),
    "web-renderer.md": documentBook(root, "Web renderer: ownership and boundaries", ["docs/WEB-RENDERER.md"]) + "\n" +
      sourceBook(root, "Complete contract-to-controller source walkthrough", [
        ...["note", "commands", "journeys", "surfaces", "product", "dependencies", "distributions"]
          .map(name => `products/notebook/${name}.ts`),
        "src/interaction/catalog.ts", "src/interaction/grammar.ts", "src/interaction/form.ts",
        "src/interaction/bank-schema.ts", "src/interaction/bank-node.ts", "src/interaction/bank-events.ts", "src/svelte/BankRenderer.svelte",
        "src/check-surface.ts", "src/project-surface.ts", "src/web/build.ts",
        "src/build/svelte/template/src/routes/+page.svelte", "src/svelte/renderer-contracts.ts", "src/svelte/renderer-registry.ts",
        "src/svelte/HumanProduct.svelte", "src/svelte/ProductWorkspace.svelte", "src/svelte/Collection.svelte", "src/svelte/collection-retrieval.ts", "src/svelte/SurfaceHost.svelte", "src/svelte/SurfaceFrame.svelte",
        "src/interaction/surface-frame.ts", "src/interaction/frame-presenters.ts", "src/interaction/fact-presentation.ts", "src/interaction/review-changes.ts", "src/web/client/frame.ts", "src/svelte/FrameBody.svelte",
        "src/interaction/toolbar.ts", "src/interaction/intent.ts", "src/interaction/face.ts", "src/interaction/selection-option.ts", "src/interaction/transient-frame.ts", "src/interaction/control-nodes.ts",
        "src/interaction/control-bank.ts", "src/interaction/extended-nodes.ts", "src/interaction/extended-controls.ts",
        "src/interaction/money.ts", "src/interaction/input-mask.ts", "src/interaction/decimal-mask-locale.ts", "src/interaction/information-content.ts",
        "src/svelte/pieces/Toolbar.svelte", "src/svelte/pieces/Face.svelte", "src/svelte/pieces/FieldWell.svelte",
        "src/svelte/pieces/SearchField.svelte", "src/svelte/pieces/MeasuredField.svelte", "src/svelte/pieces/control-measure.css",
        "src/svelte/pieces/GroupedPanel.svelte", "src/svelte/pieces/ChoiceRow.svelte", "src/svelte/pieces/SelectionField.svelte",
        "src/svelte/pieces/CollectionState.svelte", "src/svelte/pieces/Action.svelte", "src/svelte/pieces/action-icons.ts",
        "src/svelte/vendor/components/ui/button/button.svelte", "src/svelte/vendor/components/ui/button/press-feedback.ts",
        "src/svelte/controls/SelectControl.svelte", "src/svelte/controls/PopoverControl.svelte", "src/svelte/controls/FileControl.svelte",
        "src/svelte/controls/ControlRenderer.svelte", "src/svelte/controls/OptionsControl.svelte", "src/svelte/controls/MoneyControl.svelte",
        "src/svelte/controls/DateControl.svelte", "src/svelte/controls/MediaControl.svelte", "src/svelte/pieces/AnchoredSurface.svelte",
        "src/svelte/Fields.svelte", "src/svelte/pieces/TextInput.svelte", "src/svelte/pieces/MaskedInput.svelte",
        "src/svelte/pieces/CharacterCounter.svelte", "src/svelte/pieces/ClearInput.svelte",
        "src/svelte/pieces/input-edit-history.ts",
        "src/svelte/ContextPanel.svelte", "src/svelte/Facts.svelte", "src/svelte/Review.svelte",
        "src/svelte/pieces/DestinationRow.svelte",
        "src/svelte/pieces/Drawer.svelte", "src/svelte/pieces/drawer-motion.svelte.ts",
        "src/validation-result.ts", "src/web/client/field-feedback.ts", "src/web/client/model.ts", "src/web/client/mutations.ts", "src/web/client/transport.ts",
        "src/web/gateway.ts", "src/web/dispatch.ts", "src/local/session.ts",
        "src/local/admission.ts", "src/local/prepare.ts", "src/local/accept.ts", "src/local/database.ts",
      ]),
  };
}

export function checkReferences(root = sourceRoot) {
  for (const [name, expected] of Object.entries(generatedReferences(root))) {
    if (read(root, `skills/desert/references/${name}`) !== expected) throw new Error(`STALE_REFERENCE: ${name}`);
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  if (process.argv[2] === "--check") { checkReferences(); console.log("Authoring references match source."); }
  else if (process.argv[2] === "--write") {
    for (const [name, content] of Object.entries(generatedReferences())) {
      writeFileSync(join(sourceRoot, "skills/desert/references", name), content);
    }
    console.log("Authoring references generated from source.");
  } else throw new Error("Use --check or --write");
}
