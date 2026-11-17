import { expect, it } from "vitest";
import { object } from "../../fields/visible-text.ts";
import { toolAct } from "../../tools/act-definition.ts";
import type { ActContext } from "../../tools/tool-contract.ts";
import { effect } from "../facts.ts";
import { contractRig } from "../../../tests/support/contract-rig.ts";
import { deferred, settled, saved } from "../../../tests/support/kit-running.ts";
import type { Shop } from "../../../tests/support/shop.ts";
it("retirar la capacidad de ver corta el acto visual pendiente y el permiso no lo revive", async () => {
  const nothing = object({});
  const done = deferred<typeof saved>();
  let context: ActContext<Shop> | undefined;
  const see = toolAct<Shop, typeof nothing>(
    nothing,
    (_, current) => {
      context = current;
      return done.promise;
    },
    "house",
    value => value,
    ["sees"],
  );
  const rig = contractRig({ see });
  try {
    rig.bus.emit(effect("assistant-enabled", { owner: "beto", name: "Nora" }, "ana"));
    rig.bus.emit(effect("assistant-kit-set", { owner: "beto", kit: [{ tool: "desk", acts: ["see"] }] }, "beto"));
    rig.bus.emit(
      effect(
        "mind-card-assigned",
        { mind: "assistant:beto", card: "visual", version: "v1", capabilities: ["sees"] },
        "ana",
      ),
    );
    const result = rig.act("assistant:beto", "see", {}, "desk");
    expect(result.status).toBe("processing");
    rig.bus.emit(
      effect("mind-card-assigned", { mind: "assistant:beto", card: "text", version: "v2", capabilities: [] }, "ana"),
    );
    expect(context?.signal?.aborted).toBe(true);
    rig.bus.emit(
      effect(
        "mind-card-assigned",
        { mind: "assistant:beto", card: "visual", version: "v3", capabilities: ["sees"] },
        "ana",
      ),
    );
    done.resolve(saved);
    expect(await settled(result)).toMatchObject({ status: "interrupted" });
    expect(rig.state().entries).toEqual([]);
  } finally {
    done.resolve(saved);
    rig.close();
  }
});
