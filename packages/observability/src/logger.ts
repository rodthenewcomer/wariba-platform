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

const FORBIDDEN_FIELD_PATTERN = /(password|secret|token|apikey|api_key)/i;

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

function sanitize(context: LogContext): LogContext {
  const clean: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (FORBIDDEN_FIELD_PATTERN.test(key)) {
      clean[key] = '[REDACTED]';
      continue;
    }
    clean[key] = value;
  }
  return clean;
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
