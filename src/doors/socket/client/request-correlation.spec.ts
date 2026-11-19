// A client resolves a pending act when the server substitutes an explicitly tagged identifier digest.
import { expect, it } from "vitest";
import { duplexPair } from "node:stream";
import { socketHouse } from "../../../../tests/support/socket-house.ts";
import { shopRegistry, type Shop } from "../../../../tests/support/shop.ts";
import { socketConnection, type SocketConnection } from "./socket-connection.ts";
import { socketPorts } from "./socket-ports.ts";
import { clientRequests } from "./client-requests.ts";
import { requestDigest } from "../requests/public-message.ts";
import { settle } from "../../../surface/bridge/ports/house-ports.ts";
it("correlates a digest response without timing out or executing the action twice", async () => {
  const h = await socketHouse("stream"),
    pair = duplexPair(),
    connection = socketConnection<Shop>("ana-terminal");
  h.attach(pair[1]);
  await connection.attach(pair[0]);
  try {
    const ports = socketPorts(connection, { registry: shopRegistry, limits: { recentLines: 20 } });
    await settle(ports.act({ act: "attend", input: { target: "payments" } }, 0));
    const receive = connection.receive;
    const mapped: SocketConnection<Shop> = {
      ...connection,
      receive: listener =>
        receive(message =>
          listener(
            "id" in message && message.id
              ? { ...message, id: requestDigest(message.id), correlation: "sha256" }
              : message,
          ),
        ),
    };
    const act = clientRequests(mapped);
    const result = await settle(act({ act: "receive", target: "payments", input: { payment: "once", amount: 19 } }, 0));
    expect(result.status).toBe("accepted");
    expect(connection.state().tools.payments.received).toBe(19);
  } finally {
    connection.close();
    pair[1].destroy();
    await h.close();
  }
});
