import { expect, it } from "vitest";
import { setTimeout as delay } from "node:timers/promises";
import { socketHouse } from "../../tests/support/socket-house.ts";
it("shutdown also waits for an act started inside the house rather than by a socket peer", async () => {
  let finish = () => {};
  const hold = new Promise<void>(resolve => {
    finish = resolve;
  });
  const f = await socketHouse("stream", hold);
  try {
    f.house().tools.act({ act: "attend", input: { target: "payments" } }, 0, "ana");
    const act = f
      .house()
      .tools.act({ act: "receive", target: "payments", input: { payment: "p", amount: 7 } }, 0, "ana");
    expect(act.status).toBe("processing");
    let closed = false;
    const closing = f
      .server()
      .close()
      .then(result => {
        closed = true;
        return result;
      });
    await delay(30);
    expect(closed).toBe(false);
    finish();
    expect(await closing).toEqual({ remaining: 0 });
    if (act.status === "processing") expect((await act.completion).status).toBe("accepted");
  } finally {
    finish();
    await f.close();
  }
});
