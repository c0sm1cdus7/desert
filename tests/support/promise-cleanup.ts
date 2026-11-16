// Run before workers start, including a run that contains no derived program checks.
import { reapPromises } from "../../src/checks/promise-temporaries.ts";

export default function setup(): void {
  reapPromises();
}
