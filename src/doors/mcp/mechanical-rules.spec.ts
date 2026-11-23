// The MCP door creates drafts, administers rules and receives the same block from the executor.
import { expect, it } from "vitest";
import { mcpHouse } from "../../../tests/support/mcp-house.ts";
import { mcpResult, mcpText } from "../../../tests/support/mcp-results.ts";
import { shopRegistry } from "../../../tests/support/shop.ts";
import { rulesTool } from "../../tools/rules/rules.ts";
import { rulesTexts } from "../../texts/rules.texts.ts";
it("an identity proposes over MCP and not even the admin gets past the approved rule", async () => {
  const f = mcpHouse([...shopRegistry, rulesTool(shopRegistry)]);
  try {
    const definition = {
      id: "sales-limit",
      text: "No registrar ventas mayores a diez",
      action: { tool: "sales", act: "register" },
      condition: { operator: "gt", field: { source: "input", path: "total" }, value: 10 },
      effect: "block",
    };
    const proposal = mcpResult(
      (await f.call("act", { program: "rules", action: "propose", data: definition }, f.beto)).body,
    );
    expect(proposal.isError).toBe(false);
    expect(f.rig.state().house.rules.active.size).toBe(0);
    const approval = mcpResult(
      (await f.call("act", { program: "rules", action: "approve", data: { id: "sales-limit", version: 1 } })).body,
    );
    expect(approval.isError).toBe(false);
    const result = mcpResult(
      (await f.call("act", { program: "sales", action: "register", data: { sale: "s1", total: 1500 } })).body,
    );
    expect(result.isError).toBe(true);
    expect(mcpText(result)).toContain(rulesTexts.blocked.es);
    expect(f.rig.state().tools.sales.size).toBe(0);
    const query = mcpResult((await f.call("act", { program: "rules", action: "consult", data: {} }, f.carla)).body);
    expect(mcpText(query)).toContain("sales-limit");
  } finally {
    await f.close();
  }
});
