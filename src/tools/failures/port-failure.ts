// Only an adapter calling a port can mark its failure; keep the technical cause alongside public words.
import { type Text } from "../../fields/phrases.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
export class PortFailure extends Error {
  readonly reason: Text;
  constructor(reason: Text = toolTexts.disconnected, detail?: unknown) {
    super("PortFailure", { cause: detail });
    this.reason = reason;
  }
}
