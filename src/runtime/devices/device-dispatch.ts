// Conserva el intento y su referencia; un corte termina la espera con resultado desconocido sin reintento.
import { Value } from "@sinclair/typebox/value";
import { publicValue } from "../../adapters/public-value.ts";
import {
  deviceRequest,
  deviceResult,
  type DeviceEndpoint,
  type DeviceRequest,
  type DeviceResult,
} from "../../fields/device-protocol.ts";
import { effect } from "../../house/facts.ts";
import type { HouseBus } from "../../journal/vocabulary.ts";
import type { DeviceDispatch } from "../../tools/execution/device-execution.ts";
import type { ActResult, Program } from "../../tools/tool-contract.ts";
import { deviceTexts } from "../../texts/devices.texts.ts";
export type DeviceConnection = Readonly<{
  id: string;
  endpoint: DeviceEndpoint;
  pending: Map<string, (reason: string) => void>;
}>;
type DispatchPorts = Readonly<{
  bus: HouseBus;
  connection: (request: DeviceRequest) => DeviceConnection | undefined;
  scrub: (value: unknown) => unknown;
}>;
type PendingPorts<X extends Program> = DispatchPorts &
  Readonly<{
    request: DeviceRequest;
    connected: DeviceConnection;
    signal?: AbortSignal | undefined;
    resolve: (result: ActResult<X>) => void;
    reject: (error: Error) => void;
  }>;
class DevicePending<X extends Program> {
  private readonly ports: PendingPorts<X>;
  private settled = false;
  constructor(ports: PendingPorts<X>) {
    this.ports = ports;
  }
  private readonly aborted = () => this.unknown(deviceTexts.disconnected);
  start() {
    const { request, connected, signal, connection } = this.ports;
    connected.pending.set(request.execution, reason => this.unknown(reason));
    signal?.addEventListener("abort", this.aborted, { once: true });
    try {
      if (signal?.aborted || connection(request) !== connected) {
        this.aborted();
        return;
      }
    } catch {
      this.unknown(deviceTexts.failed);
      return;
    }
    void Promise.resolve()
      .then(() => (this.settled ? undefined : connected.endpoint.receive(request)))
      .then(
        result => this.received(result),
        () => this.unknown(deviceTexts.failed),
      );
  }
  private release() {
    this.settled = true;
    this.ports.connected.pending.delete(this.ports.request.execution);
    this.ports.signal?.removeEventListener("abort", this.aborted);
  }
  private failed(error: unknown) {
    this.ports.reject(error instanceof Error ? error : new Error(deviceTexts.failed));
  }
  private unknown(reason: string) {
    if (this.settled) return;
    this.release();
    const { bus, request, resolve } = this.ports;
    const { execution, actor, journey } = request;
    try {
      bus.emit(effect("device-execution-unknown", { execution, reason }, actor, [execution], journey));
      resolve({ status: "inconclusive", coreFailure: "inconclusive", reason });
    } catch (error) {
      this.failed(error);
    }
  }
  private received(result: unknown) {
    if (this.settled) return;
    let safe: unknown;
    try {
      safe = this.ports.scrub(publicValue(result));
    } catch {
      this.unknown(deviceTexts.failed);
      return;
    }
    if (!Value.Check(deviceResult, safe)) {
      this.unknown(deviceTexts.failed);
      return;
    }
    this.release();
    try {
      this.confirm(safe);
    } catch (error) {
      this.failed(error);
    }
  }
  private confirm(result: DeviceResult) {
    const { bus, request, resolve } = this.ports;
    const { execution, actor, journey } = request;
    bus.emit(
      effect(
        "device-execution-result",
        { execution, status: result.status, reference: result.reference },
        actor,
        [execution],
        journey,
      ),
    );
    resolve(
      result.status === "accepted"
        ? { status: "accepted", text: deviceTexts.completed(result.reference), value: result.value }
        : { status: "rejected", reason: result.reason, value: result.value },
    );
  }
}
export function deviceDispatcher(
  bus: HouseBus,
  connection: DispatchPorts["connection"],
  scrub: DispatchPorts["scrub"],
): DeviceDispatch {
  return <X extends Program>(request: DeviceRequest, signal?: AbortSignal): Promise<ActResult<X>> => {
    if (!Value.Check(deviceRequest, request))
      return Promise.resolve({ status: "rejected", reason: deviceTexts.invalid });
    const connected = connection(request);
    if (!connected || signal?.aborted) return Promise.resolve({ status: "rejected", reason: deviceTexts.unavailable });
    const { execution, actor, program, action, device, journey } = request;
    const data = {
      execution,
      actor,
      program,
      action,
      device,
      connection: connected.id,
      ...(journey ? { journey } : {}),
    };
    // Sólo cruza la entrada pública; las credenciales y capacidades de ejecución quedan en la casa.
    const input = publicValue(request.input);
    bus.emit(effect("device-execution-started", data, actor, [execution], journey));
    return new Promise<ActResult<X>>((resolve, reject) => {
      new DevicePending<X>({
        bus,
        connection,
        scrub,
        request: { ...request, input },
        connected,
        signal,
        resolve,
        reject,
      }).start();
    });
  };
}
