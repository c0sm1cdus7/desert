// Keeps the attempt and its reference; a cut ends the wait with an unknown result and no retry.
import { Value } from "@sinclair/typebox/value";
import { publicValue } from "../../adapters/public-value.ts";
import {
  deviceRequest,
  deviceResult,
  type DeviceEndpoint,
  type DeviceRequest,
  type DeviceResult,
  type NoticeAnswer,
} from "../../fields/device-protocol.ts";
import { effect, type HouseEvent } from "../../house/facts.ts";
import type { HouseBus } from "../../journal/vocabulary.ts";
import type { DeviceDispatch } from "../../tools/execution/device-execution.ts";
import type { ActResult, Program } from "../../tools/tool-contract.ts";
import { deviceTexts } from "../../texts/devices.texts.ts";
/** A notice that came before its execution's start result, waiting in the connection it came by. */
export type HeldNotice = Readonly<{
  notice: HouseEvent<"device-execution-notice">["data"];
  later: (answer: NoticeAnswer) => void;
}>;
export type DeviceConnection = Readonly<{
  id: string;
  endpoint: DeviceEndpoint;
  pending: Map<string, (reason: string) => void>;
  held: Map<string, HeldNotice>;
}>;
type DispatchPorts = Readonly<{
  bus: HouseBus;
  connection: (request: DeviceRequest) => DeviceConnection | undefined;
  scrub: (value: unknown) => unknown;
  /** Hears that an execution's start result or unknown is written, after the act has its answer. */
  resultWritten: (request: DeviceRequest) => void;
}>;
type PendingPorts<X extends Program> = DispatchPorts &
  Readonly<{
    request: DeviceRequest;
    connected: DeviceConnection;
    signal?: AbortSignal | undefined;
    beforeSend?: (() => void) | undefined;
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
      .then(() => this.send())
      .then(
        result => this.received(result),
        () => this.unknown(deviceTexts.failed),
      );
  }
  private send() {
    if (this.settled) return undefined;
    const { beforeSend, request, bus } = this.ports;
    try {
      beforeSend?.();
    } catch (error) {
      this.release();
      try {
        // This is a core refusal before sending, not a receipt from the device.
        bus.emit(
          effect(
            "device-execution-result",
            {
              execution: request.execution,
              status: "rejected",
              reference: `core:${request.execution}`,
            },
            request.actor,
            [request.execution],
            request.journey,
          ),
        );
      } catch (recordingError) {
        this.failed(recordingError);
        return undefined;
      }
      this.failed(error);
      this.settleHeld();
      return undefined;
    }
    return this.deliver();
  }
  private deliver() {
    const { connected, request } = this.ports;
    return this.settled ? undefined : connected.endpoint.receive(request);
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
      return;
    }
    this.settleHeld();
  }
  /** A notice held for this execution is recorded now; it runs after the act's answer, so it never changes it. */
  private settleHeld() {
    this.ports.resultWritten(this.ports.request);
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
      return;
    }
    this.settleHeld();
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
export function deviceDispatcher(ports: DispatchPorts): DeviceDispatch {
  const { bus, connection } = ports;
  return <X extends Program>(
    request: DeviceRequest,
    signal?: AbortSignal,
    beforeSend?: () => void,
    announces?: boolean,
  ): Promise<ActResult<X>> => {
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
      ...(announces ? { announces: true as const } : {}),
    };
    // Only public input crosses; credentials and execution capabilities stay in the house.
    const input = publicValue(request.input);
    bus.emit(effect("device-execution-started", data, actor, [execution], journey));
    return new Promise<ActResult<X>>((resolve, reject) => {
      new DevicePending<X>({
        ...ports,
        request: { ...request, input },
        connected,
        signal,
        beforeSend,
        resolve,
        reject,
      }).start();
    });
  };
}
