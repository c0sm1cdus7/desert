// Where catalog files live and which files belong to a fixed category instead of a declaration.
// The only place these paths are written; the gate, the generator and the tests read them from here.
export type CatalogLayout = Readonly<{
  roots: readonly string[];
  vendorFamilies: string;
  infra: string;
  fixed: Readonly<Record<string, readonly string[]>>;
}>;

/** Companion files a piece folder may hold beside its entry and parts. */
export const pieceCompanions = Object.freeze(["catalog", "contract", "specimens"] as const);
export const declarationSuffixes = Object.freeze([".catalog.ts", ".mechanism.ts"] as const);
