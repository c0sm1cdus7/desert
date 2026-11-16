// Evaluate the base's arguments first; only the callback itself belongs to the program.
export function programCall<A extends unknown[], R>(call: (...args: A) => R, ...args: A): R;
export function programCall<A extends unknown[], R>(call: ((...args: A) => R) | undefined, ...args: A): R | undefined;
export function programCall<A extends unknown[], R>(call: ((...args: A) => R) | undefined, ...args: A): R | undefined {
  return programRule(() => call?.(...args));
}

export function programRule<T>(read: () => T): T {
  try {
    return read();
  } catch (error) {
    throw error instanceof OutsideDefect || error instanceof BaseFailure ? error : new OutsideDefect(error);
  }
}

export class BaseFailure extends Error {
  readonly detail: unknown;
  constructor(detail: unknown) {
    super("BaseFailure", { cause: detail });
    this.detail = detail;
  }
}

/** A programmer defect must survive the house's conversion of ordinary failures into action results. */
export class OutsideDefect extends Error {
  readonly detail: unknown;
  constructor(detail: unknown) {
    super(`OutsideDefect${detail instanceof Error ? `: ${detail.message}` : ""}`, { cause: detail });
    this.detail = detail;
  }
}
