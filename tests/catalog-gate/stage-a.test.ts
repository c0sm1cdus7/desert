// Stage A of the negative suite. Escape cases are red at 572b30f by design: the gate lets them through.
// They turn green only when the finished gate rejects each one with its named code.
import { defineGateTests } from "./gate-tests.ts";
import { stageA } from "./stage-a.cases.ts";

defineGateTests(stageA);
