import { freezeDeep } from "../../../../json.ts";
import { ResolvedNodeVersion as version } from "../../../../interaction/resolved-node.ts";
import type { PublicBankInput } from "../../../infra/PublicCatalogBank-model.ts";
import { inspectionMedia } from "../../../infra/inspection-media.ts";

const image = { asset: inspectionMedia.asset, alt: inspectionMedia.alt };
const card = { version, kind: "catalog.card", record: "notebook-cover", title: "Notebook cover", image } as const;

/** Renderer-owned witness data, not a product definition, query, or controller connection. */
export const inspectionCatalog = freezeDeep({
  productId: "desert-visual-catalog",
  home: { version, kind: "catalog.home",
    featured: { ...card, presentation: "featured", eyebrow: "SDK illustration", actionLabel: "Open example" },
    groups: [{ id: "illustrations", title: "Illustrations", items: [{ ...card, presentation: "item" }] }],
  },
  details: [{ version, kind: "catalog.detail", record: card.record, title: card.title, image,
    description: "An original SDK illustration used to inspect shared media components. This local example does not read or change product data.",
  }],
} as const satisfies PublicBankInput);
