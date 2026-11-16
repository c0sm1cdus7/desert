import { expect, it, vi } from "vitest";
import * as fields from "../catalogs/fields.ts";
import { openingFixture, registered } from "../../tests/support/opening-cleanup.ts";
import { shopShown } from "../../tests/support/shop.ts";
import { defaultsIn } from "./promised-laws.ts";
import { openingChecks } from "./coverage/opening-checks.ts";
import { perform, staged } from "./promised-stage.ts";

it("makes written defaults consult the shared field validation", () => {
  const validity = vi.spyOn(fields, "fieldValidity").mockReturnValue({ invalid: true, wrong: undefined });
  try {
    expect(() => defaultsIn(fields.quantity("Cantidad", 1))).toThrow(/1/u);
    expect(validity).toHaveBeenCalled();
  } finally {
    validity.mockRestore();
  }
});
it("makes execution consult the same validation before running", async () => {
  const { program } = openingFixture();
  await staged(program, async ({ house }) => {
    const validity = vi.spyOn(fields, "fieldValidity").mockReturnValue({ invalid: true, wrong: undefined });
    try {
      const done = await perform(house(), "sales", registered);
      expect(done.status).toBe("rejected");
      expect(house().tools.state().tools.sales.size).toBe(0);
      expect(validity).toHaveBeenCalled();
    } finally {
      validity.mockRestore();
    }
  });
});
it("makes calculated defaults consult the same validation", async () => {
  const { program, aim } = openingFixture();
  const original = fields.fieldValidity;
  const validity = vi
    .spyOn(fields, "fieldValidity")
    .mockImplementation((schema, value, at) =>
      typeof value === "number" ? { invalid: true, wrong: undefined } : original(schema, value, at),
    );
  try {
    await expect(openingChecks(program, aim, shopShown)).rejects.toThrow(/amount.*1500/u);
    expect(validity).toHaveBeenCalled();
  } finally {
    validity.mockRestore();
  }
});
