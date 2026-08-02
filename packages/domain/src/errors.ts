/**
 * Domain error — Engineering Constitution §11.1/§11.2: no generic
 * `throw new Error("Something went wrong")`. Every domain error carries a
 * stable code (mapped to HTTP/WebSocket/UI/logs), a user-safe message, and
 * whether the caller may retry.
 */
export class DomainError extends Error {
  readonly code: string;
  readonly userMessage: string;
  readonly retryable: boolean;
  readonly context?: Record<string, unknown>;

  constructor(params: {
    code: string;
    userMessage: string;
    retryable: boolean;
    context?: Record<string, unknown>;
  }) {
    super(params.code);
    this.name = 'DomainError';
    this.code = params.code;
    this.userMessage = params.userMessage;
    this.retryable = params.retryable;
    if (params.context !== undefined) {
      this.context = params.context;
    }
  }
}
