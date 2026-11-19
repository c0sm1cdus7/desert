// Anonymous guesses, including forged origins, cannot consume another person's redemption capacity.
import { expect, it } from "vitest";
import { doorHouse, invitationCode, redemptionRequest } from "../../../tests/support/door-house.ts";
it("admits an independent valid redemption during sustained distributed anonymous abuse", async () => {
  const h = doorHouse(),
    first = h.door(),
    second = h.door();
  try {
    const code = invitationCode(await h.act("invite", { door: "agente" }, "identities/beto"));
    for (let round = 0; round < 3; round++) {
      for (let attempt = 0; attempt < 100; attempt++) {
        const request = redemptionRequest("invalid");
        await (attempt % 2 ? first : second).handle({
          ...request,
          headers: {
            ...request.headers,
            "x-forwarded-for": `192.0.2.${attempt}`,
            "x-real-ip": `198.51.100.${attempt}`,
          },
          body: () => [Buffer.from(JSON.stringify({ code: attempt % 2 ? "invalid" : "2222-2222" }))],
        });
      }
      const candidate = ["2222-2222", "3333-3333", "4444-4444"][round] ?? "5555-5555";
      expect((await first.handle(redemptionRequest(candidate))).status).toBe(400);
      const independent = invitationCode(await h.act("invite", { door: "agente" }, "identities/beto"));
      expect((await second.handle(redemptionRequest(independent))).status).toBe(200);
      h.advance(60_000);
    }
    // Keep the current window exhausted, too.
    for (let attempt = 0; attempt < 10; attempt++) await first.handle(redemptionRequest("invalid"));
    expect((await second.handle(redemptionRequest(code))).status).toBe(200);
  } finally {
    await first.close();
    await second.close();
    h.close();
  }
});
