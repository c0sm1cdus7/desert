import type { AuthoredView, ViewTarget } from "../modules/authored-types.ts";
import { publicReference } from "../modules/references.ts";
import { declarationRecord } from "../modules/declaration-data.ts";
import { view as canonicalView } from "./view.ts";

export function viewTargetDefinition(value: ViewTarget) {
  const emitted = publicReference(value, "view");
  return emitted ? declarationRecord(emitted.value) : declarationRecord(value);
}

/** Validate the View's data while retaining composition identity until the module boundary. */
export function authoredViewData(value: AuthoredView) {
  const source = declarationRecord(value);
  const docks = Object.fromEntries(["leftDock", "rightDock"].filter(key => Object.hasOwn(source, key)).map(key => {
    const dock = declarationRecord(source[key]);
    if (typeof dock.view === "string") throw new Error("STRING_MODULE_REFERENCE_FORBIDDEN");
    return [key, { ...dock, view: viewTargetDefinition(dock.view as ViewTarget).id }];
  }));
  return canonicalView({ ...source, ...docks });
}
export function authoredView<const V extends AuthoredView>(value: V): V {
  const source = declarationRecord(value);
  const checked = authoredViewData(value);
  return Object.freeze({ ...checked, ...Object.fromEntries(["leftDock", "rightDock"].filter(key => Object.hasOwn(source, key)).map(key =>
    [key, Object.freeze(declarationRecord(source[key]))])) }) as unknown as V;
}
