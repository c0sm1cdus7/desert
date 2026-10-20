import { createShapeValidator } from "../../src/client.ts";

export function inspectNote(schema: object, draft: unknown) {
  const validate = createShapeValidator(schema);
  return validate(draft);
}
