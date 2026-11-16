// Ordinary derived checks must also run on a program whose old object is outside their window.
import { describe, it } from "vitest";
import { walkedChecks } from "./promised-walk.ts";
import { promisedChecks } from "../cases/promised.ts";
import { windowProgram, windowShown } from "../../../../tests/support/window-program.ts";

describe("an old thing in a declared program case", () => {
  for (const check of promisedChecks(windowProgram, windowShown)) it(check.name, check.run);
  for (const check of walkedChecks(windowProgram, windowShown)) it(check.name, check.run);
});
