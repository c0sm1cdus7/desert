// Run before workers start, including a run that contains no derived program checks.
import { reapPromises } from "../../src/programs/promise-temporaries.ts";

export default function setup(): void {
  reapPromises();
}
