// Only an explicit missing destination may be shown as gone; other reading failures retain their diagnosis.
import { OutsideDefect } from "../../fields/program-call.ts";
export class MissingView extends OutsideDefect {
  constructor(tool: string, target: string) {
    super(new Error(`${tool} has no ${target}`));
  }
}
