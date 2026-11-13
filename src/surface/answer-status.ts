// A question's live reason and whether its written answer can advance come from the same declarations.
import type { Field } from "./contract.ts";
import type { Walk } from "./screen.ts";

type Act = Readonly<{ stops?: (answers: readonly string[]) => string | undefined }>;
export function withStops(walk: Walk, field: Field, act: Act): Field {
  if (field.kind !== "text" && field.kind !== "secret") return field;
  const wrong = (typed: string): string | undefined => {
    const reason = field.wrong?.(typed);
    if (reason !== undefined) return reason;
    if (!(field.valid ?? (value => value.trim() !== ""))(typed)) return undefined;
    return act.stops?.([...walk.answers.slice(0, walk.pos), typed]);
  };
  return { ...field, wrong };
}
