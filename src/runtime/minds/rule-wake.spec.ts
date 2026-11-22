// Approving wakes the held mind, including a journey's wait, without repeating actions.
import { expect, it } from "vitest";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shopRegistry, type Shop } from "../../../tests/support/shop.ts";
import { rulesTool } from "../../tools/rules/rules.ts";
import { toolAct } from "../../tools/act-definition.ts";
import { Type } from "@sinclair/typebox";
import { effect } from "../../house/facts.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { mindWakeDecision } from "./mind-wake-policy.ts";
import { ruleWake } from "./rule-wake.ts";
it("approves after restarting and wakes only the held actor without repeating the effect", async () => {
  let sent = 0;
  const input = Type.Object({});
  const registry = [
    ...shopRegistry,
    {
      id: "probe",
      purpose: "Prueba",
      view: () => "",
      targets: () => [],
      summary: () => "",
      acts: {
        send: toolAct<Shop, typeof input>(input, () => {
          sent++;
          return { status: "accepted" };
        }),
      },
    },
  ];
  const rig = shopRig({ registry: [...registry, rulesTool(registry)] });
  try {
    rig.attend("ana", "rules");
    rig.attend("beto", "rules");
    rig.bus.emit(effect("kit-set", { holder: "mind:probe", tool: "probe", acts: ["send"] }, "ana"));
    const definition = {
      id: "pause",
      text: "Pausa",
      action: { tool: "probe", act: "send" },
      condition: { operator: "actor", kind: "program" },
      effect: "block",
    };
    expect((await settle(rig.act("ana", "save", definition, "rules"))).status).toBe("accepted");
    expect((await settle(rig.act("mind:probe", "send", {}, "probe"))).status).toBe("rejected");
    await settle(
      rig.act("beto", "propose", { ...definition, condition: { operator: "actor", kind: "identity" } }, "rules"),
    );
    rig.restart();
    await settle(rig.act("ana", "approve", { id: "pause", version: 2 }, "rules"));
    const events = rig.facts();
    const approved = events.findLast(event => event.kind === "rule-approved");
    if (!approved) throw new Error("missing approval");
    expect(sent).toBe(0);
    const policy = {
      scope: { kind: "consciousness" as const, actor: "mind:probe" as const },
      name: "Prueba",
      message: () => undefined,
      toolOf: () => "probe",
      talks: false,
    };
    expect(mindWakeDecision(policy, approved, events, 0)).toBe(true);
    expect(ruleWake({ kind: "consciousness", actor: "mind:sales" }, approved, events)).toBe(false);
    const draft = events.findLast(event => event.kind === "rule-versioned");
    if (!draft) throw new Error("missing draft");
    expect(ruleWake(policy.scope, draft, events)).toBe(false);
    const again = { ...definition, id: "other" };
    await settle(rig.act("ana", "save", again, "rules"));
    expect(sent).toBe(0);
  } finally {
    rig.close();
  }
});
