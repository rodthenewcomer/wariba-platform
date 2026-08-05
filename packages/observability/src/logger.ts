/**
 * Structured JSON logger.
 * WARIBA Engineering Constitution §41 — JSON structuré, champs minimums, aucun secret.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

const FORBIDDEN_FIELD_PATTERN =
  /(password|secret|token|apikey|api_key|authorization|cookie|session|jwt|refresh|ssn|email|phone|iban|card(number)?|pan|cvv)/i;

// Reserved record fields — never let caller-supplied context/bindings override
// what the logger itself sets (would let a context object masquerade a real
// `error`/`fatal` event as `level: 'debug'` to log filters/alerting).
const RESERVED_FIELDS = new Set(['timestamp', 'level', 'service', 'module', 'event']);

export interface LogContext {
  correlationId?: string;
  accountId?: string;
  userIdHash?: string;
  requestId?: string;
  durationMs?: number;
  errorCode?: string;
  [key: string]: unknown;
}

export interface LoggerOptions {
  service: string;
  module?: string;
  minLevel?: LogLevel;
  /** Injectable sink, defaults to stdout. Enables deterministic tests. */
  write?: (line: string) => void;
  /** Injectable clock, defaults to real time. Enables deterministic tests. */
  now?: () => Date;
}

export interface Logger {
  debug(event: string, context?: LogContext): void;
  info(event: string, context?: LogContext): void;
  warn(event: string, context?: LogContext): void;
  error(event: string, context?: LogContext): void;
  fatal(event: string, context?: LogContext): void;
  child(bindings: LogContext): Logger;
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    return sanitizeRecord(value as Record<string, unknown>);
  }
  return value;
}

function sanitizeRecord(context: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (RESERVED_FIELDS.has(key)) {
      continue;
    }
    if (FORBIDDEN_FIELD_PATTERN.test(key)) {
      clean[key] = '[REDACTED]';
      continue;
    }
    clean[key] = sanitizeValue(value);
  }
  return clean;
}

function sanitize(context: LogContext): LogContext {
  return sanitizeRecord(context) as LogContext;
}

export function createLogger(options: LoggerOptions): Logger {
  const minLevel = options.minLevel ?? 'info';
  const write = options.write ?? ((line: string) => process.stdout.write(line + '\n'));
  const now = options.now ?? (() => new Date());

  function log(level: LogLevel, event: string, context: LogContext, bindings: LogContext): void {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[minLevel]) {
      return;
    }
    const record = {
      timestamp: now().toISOString(),
      level,
      service: options.service,
      module: options.module,
      event,
      ...sanitize(bindings),
      ...sanitize(context),
    };
    write(JSON.stringify(record));
  }

  function build(bindings: LogContext): Logger {
    return {
      debug: (event, context = {}) => log('debug', event, context, bindings),
      info: (event, context = {}) => log('info', event, context, bindings),
      warn: (event, context = {}) => log('warn', event, context, bindings),
      error: (event, context = {}) => log('error', event, context, bindings),
      fatal: (event, context = {}) => log('fatal', event, context, bindings),
      child: (childBindings) => build({ ...bindings, ...childBindings }),
    };
  }

  return build({});
}
