import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
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
    "src/local.ts", "src/prepare-options.ts", "src/local/controller.ts", "src/local/session.ts", "src/local/identity.ts",
    "src/web/build.ts", "src/views/schema.ts", "src/views/media-library.ts", "src/views/ports.ts",
    "src/views/program-schema.ts", "src/views/program.ts", "src/views/program-views.ts",
    "src/views/program-outputs.ts", "src/modules/schema.ts", "src/modules/ownership.ts",
    "src/modules/presentation.ts", "src/modules/product-index.ts", "src/modules/human-presentation.ts", "src/modules/compile-exposures.ts",
    "src/modules/admission.ts", "src/modules/references.ts", "src/modules/reference-types.ts", "src/modules/lower-references.ts",
    "src/modules/declaration-data.ts", "src/modules/links.ts", "src/modules/module-source.ts",
    "src/human-exposure.ts", "src/navigation-ownership.ts", "src/connection-policy.ts", "src/surface-fields.ts",
    "src/field-definition.ts", "src/field-representation.ts", "src/command-input-targets.ts", "src/preparation-projection.ts", "src/interaction/protocol.ts",
    "src/authoring/index.ts", "src/authoring/imports.ts", "src/authoring/syntax.ts", "src/authoring/expressions.ts"])];
  const notebookAuthoring = readdirSync(join(root, "products/notebook/src"), { recursive: true })
    .filter((path): path is string => typeof path === "string" && path.endsWith(".ts"))
    .sort().map(path => `products/notebook/src/${path}`);
  const notebook = [...notebookAuthoring,
    ...["product", "distributions", "inspect", "local", "run-local", "build-web", "check-web", "run-web", "verify"]
      .map(name => `products/notebook/${name}.ts`)];
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
      "src/svelte/infra/media-source.ts", "src/svelte/catalog/foundations/image/Image.svelte",
      "src/svelte/catalog/compositions/photo-collection/PhotoCollection.svelte", "src/svelte/catalog/compositions/viewer/Viewer.svelte",
      "src/svelte/infra/gestures.ts",
      "src/svelte/catalog/renderer/public-catalog-product/PublicCatalogProduct.svelte", "src/svelte/catalog/renderer/local-exercises/LocalExercises.svelte",
      "src/svelte/catalog/foundations/catalog-card/CatalogCard.svelte", "src/svelte/catalog/compositions/catalog-workspace/CatalogToolbar.svelte",
      "src/svelte/catalog/renderer/public-catalog-bank/PublicCatalogBank.svelte", "src/svelte/infra/PublicCatalogBank-model.ts",
    ]),
    "support.md": documentBook(root, "Supported behavior and evidence", ["docs/STATUS.md"]),
    "runtime.md": documentBook(root, "Runtime, authority and stack", ["docs/STACK.md", "docs/NATIVE-RENDERER-MAPPING.md", "docs/LOCAL-CONTROLLER.md"]),
    "distributions.md": documentBook(root, "Building supported distributions", ["docs/DISTRIBUTION-BUILDS.md"]) + "\n" +
      sourceBook(root, "Distribution build entrypoints", ["src/build/index.ts", "src/build/serve.ts", "src/build/manifest.ts",
        "src/build/media.ts", "src/build/media-handler.ts", "src/build/media-references.ts",
        "src/build/svelte/template/src/routes/+page.svelte",
        "src/local/developer-host.ts", "src/local/developer-identity.ts"]),
    "testing.md": documentBook(root, "Derived local verification", ["docs/DERIVED-VERIFICATION.md"]) + "\n" +
      sourceBook(root, "Testing entrypoints and contracts", ["src/testing/index.ts", "src/testing/types.ts",
        "src/testing/postgres.ts", "products/notebook/verify.ts"]),
    "web-renderer.md": documentBook(root, "Web renderer: ownership and boundaries", ["docs/WEB-RENDERER.md"]) + "\n" +
      sourceBook(root, "Complete contract-to-controller source walkthrough", [
        ...notebookAuthoring, "products/notebook/distributions.ts",
        "src/interaction/catalog.ts", "src/field-representation.ts", "src/interaction/form.ts",
        "src/interaction/resolved-node-schema.ts", "src/interaction/resolved-node.ts", "src/interaction/node-events.ts", "src/svelte/catalog/renderer/node-renderer/NodeRenderer.svelte",
        "src/check-surface.ts", "src/project-surface.ts", "src/web/build.ts",
        "src/build/svelte/template/src/routes/+page.svelte", "src/svelte/renderer-contracts.ts", "src/svelte/renderer-registry.ts",
        "src/views/program-schema.ts", "src/views/program.ts", "src/views/resolved.ts",
        "src/web/client/view-program.ts", "src/web/client/view-projection.ts",
        "src/svelte/catalog/renderer/view-product/ViewProduct.svelte", "src/svelte/catalog/renderer/workspace/Workspace.svelte",
        "src/svelte/catalog/compositions/view-workspace/workspace-data.ts", "src/svelte/infra/media-data.ts", "src/svelte/catalog/renderer/media-content/MediaContent.svelte",
        "src/svelte/catalog/compositions/catalog-workspace/CatalogWorkspace.svelte", "src/svelte/catalog/compositions/catalog-navigation/CatalogNavigation.svelte",
        "src/svelte/catalog/compositions/toolbar-layout/CatalogNavigationActions.svelte", "src/svelte/catalog/compositions/catalog-workspace/CatalogToolbar.svelte",
        "src/svelte/infra/workspace-navigation.ts", "src/svelte/infra/workspace-search.ts",
        "src/svelte/catalog/renderer/view-content/ViewContent.svelte", "src/svelte/catalog/renderer/view-item/ViewItem.svelte",
        "src/svelte/catalog/renderer/panel/Panel.svelte", "src/svelte/catalog/renderer/inspection-content/InspectionContent.svelte",
        "src/svelte/catalog/compositions/inspection/inspection-fixture.ts", "src/svelte/infra/inspection-media.ts",
        "src/svelte/catalog/compositions/access-gate/AccessGate.svelte", "src/svelte/catalog/compositions/collection/Collection.svelte", "src/svelte/collection-retrieval.ts", "src/svelte/catalog/compositions/surface-frame/SurfaceFrame.svelte",
        "src/interaction/surface-frame.ts", "src/interaction/frame-presenters.ts", "src/interaction/fact-presentation.ts", "src/interaction/review-changes.ts", "src/web/client/frame.ts", "src/svelte/catalog/renderer/frame-body/FrameBody.svelte",
        "src/interaction/toolbar.ts", "src/interaction/intent.ts", "src/interaction/face.ts", "src/interaction/selection-option.ts", "src/interaction/transient-frame.ts", "src/interaction/control-nodes.ts",
        "src/interaction/control-specimens.ts", "src/interaction/extended-nodes.ts", "src/interaction/extended-controls.ts",
        "src/interaction/money.ts", "src/interaction/input-mask.ts", "src/interaction/decimal-mask-locale.ts", "src/interaction/information-content.ts",
        "src/svelte/catalog/compositions/toolbar/Toolbar.svelte", "src/svelte/catalog/foundations/face/Face.svelte", "src/svelte/catalog/foundations/field-well/FieldWell.svelte",
        "src/svelte/catalog/foundations/search-field/SearchField.svelte", "src/svelte/catalog/foundations/measured-field/MeasuredField.svelte", "src/svelte/catalog/foundations/field/field-measure.css",
        "src/svelte/catalog/foundations/grouped-panel/GroupedPanel.svelte", "src/svelte/catalog/foundations/choice-row/ChoiceRow.svelte", "src/svelte/catalog/foundations/selection-field/SelectionField.svelte",
        "src/svelte/catalog/compositions/collection-state/CollectionState.svelte", "src/svelte/catalog/foundations/action/Action.svelte", "src/svelte/infra/action-icons.ts",
        "src/svelte/vendor/components/ui/button/button.svelte", "src/svelte/vendor/components/ui/button/press-feedback.ts",
        "src/svelte/catalog/compositions/select-control/SelectControl.svelte", "src/svelte/catalog/compositions/popover-control/PopoverControl.svelte", "src/svelte/catalog/compositions/file-control/FileControl.svelte",
        "src/svelte/catalog/renderer/control-renderer/ControlRenderer.svelte", "src/svelte/catalog/compositions/options-control/OptionsControl.svelte", "src/svelte/catalog/compositions/money-control/MoneyControl.svelte",
        "src/svelte/catalog/foundations/date-control/DateControl.svelte", "src/svelte/catalog/compositions/media-control/MediaControl.svelte", "src/svelte/catalog/compositions/popover-control/AnchoredSurface.svelte",
        "src/svelte/catalog/compositions/fields/Fields.svelte", "src/svelte/catalog/foundations/field/Field.svelte", "src/svelte/catalog/foundations/field/FieldEditor.svelte",
        "src/svelte/catalog/foundations/text-input/TextInput.svelte", "src/svelte/catalog/foundations/masked-input/MaskedInput.svelte",
        "src/svelte/catalog/foundations/character-counter/CharacterCounter.svelte", "src/svelte/catalog/foundations/clear-input/ClearInput.svelte",
        "src/svelte/catalog/foundations/masked-input/input-edit-history.ts",
        "src/svelte/catalog/compositions/context-panel/ContextPanel.svelte", "src/svelte/catalog/renderer/facts/Facts.svelte", "src/svelte/catalog/compositions/review/Review.svelte",
        "src/svelte/catalog/foundations/destination-row/DestinationRow.svelte",
        "src/svelte/catalog/foundations/drawer/Drawer.svelte", "src/svelte/infra/drawer-motion.svelte.ts",
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
