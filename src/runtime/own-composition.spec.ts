import "../../tests/support/fixture-vault.ts";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { ownAct } from "../tools/act-definition.ts";
import { nothing } from "../../tests/support/effect-authority.ts";
import { shopProgram, type Shop } from "../../tests/support/shop.ts";
import { startHouse } from "./house-runtime.ts";
it("the composition checks own for the identities of a house not yet created", () => {
  const home = mkdtempSync(join(tmpdir(), "kit6c-composition-"));
  try {
    expect(() => {
      const house = startHouse<Shop>(home, {
        ...shopProgram,
        by: "shop",
        creation: { admin: "ana", assignments: [{ identity: "beto", tools: ["sales"] }] },
        own: state =>
          state.by === "beto"
            ? [
                ownAct(
                  "sales",
                  "register",
                  {
                    input: nothing,
                    purpose: "Sombra",
                  },
                  () => ({ status: "accepted" }),
                ),
              ]
            : [],
      });
      house.close();
    }).toThrow(/register.*sales|sales.*register/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
