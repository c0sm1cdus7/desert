// Only an adapter calling a port can mark its failure; keep the technical cause alongside public words.
import { toolTexts } from "../../texts/tools.texts.ts";
export class PortFailure extends Error {
  readonly reason: string;
  constructor(reason: string = toolTexts.disconnected, detail?: unknown) {
    super("PortFailure", { cause: detail });
    this.reason = reason;
  }
}
