export enum CircuitState {
  CLOSED = "CLOSED", // Normal operation
  OPEN = "OPEN", // Failing, fast-reject calls
  HALF_OPEN = "HALF_OPEN", // Testing if service recovered
}

export interface CircuitBreakerOptions {
  failureThreshold?: number; // consecutive failures before opening circuit (default 3)
  recoveryTimeMs?: number; // time to wait before half-open probe (default 30000ms / 30s)
  timeoutMs?: number; // execution timeout (default 7000ms)
  name?: string;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly failureThreshold: number;
  private readonly recoveryTimeMs: number;
  private readonly timeoutMs: number;
  private readonly name: string;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold || 3;
    this.recoveryTimeMs = options.recoveryTimeMs || 30000;
    this.timeoutMs = options.timeoutMs || 7000;
    this.name = options.name || "default";
  }

  public getState(): CircuitState {
    if (this.state === CircuitState.OPEN) {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.recoveryTimeMs) {
        this.state = CircuitState.HALF_OPEN;
      }
    }
    return this.state;
  }

  public async execute<T>(action: () => Promise<T>, fallback: () => Promise<T> | T): Promise<T> {
    const currentState = this.getState();

    if (currentState === CircuitState.OPEN) {
      return typeof fallback === "function" ? fallback() : fallback;
    }

    try {
      // Execute with timeout promise race
      const result = await Promise.race([
        action(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`CircuitBreaker [${this.name}] timeout after ${this.timeoutMs}ms`)), this.timeoutMs)
        ),
      ]);

      this.onSuccess();
      return result;
    } catch (err: any) {
      this.onFailure(err);
      return typeof fallback === "function" ? fallback() : fallback;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
  }

  private onFailure(err: any): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN || this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      console.warn(`[CIRCUIT BREAKER] '${this.name}' tripped OPEN due to failures (${this.failureCount}). Fallbacks will be served for ${this.recoveryTimeMs / 1000}s.`);
    }
  }

  public reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
}
