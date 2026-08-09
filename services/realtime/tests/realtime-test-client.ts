import type { RawData } from 'ws';
import WsClient from 'ws';
import { createMessageBuffer, type MessageBuffer, type RealtimeMessage } from './message-buffer.js';

type MessagePredicate = (message: RealtimeMessage) => boolean;

interface RealtimeTestClientOptions {
  token: string;
  url: string;
  defaultTimeoutMs?: number;
  serverDiagnostics?: () => string;
}

interface SendAndAwaitOptions {
  command: unknown;
  expectedEvent: string;
  predicate?: MessagePredicate;
  timeoutMs?: number;
}

function describeServerError(message: RealtimeMessage): string {
  const payload = message.payload;
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return JSON.stringify(payload);
  }
  const record = payload as Record<string, unknown>;
  return `code=${String(record.code ?? 'unknown')} message=${String(record.message ?? 'unknown')}`;
}

function parseMessage(raw: RawData): RealtimeMessage | null {
  try {
    const value: unknown = JSON.parse(raw.toString());
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    if (typeof record.type !== 'string' || !Object.hasOwn(record, 'payload')) return null;

    const message: RealtimeMessage = { type: record.type, payload: record.payload };
    if (typeof record.correlationId === 'string') message.correlationId = record.correlationId;
    return message;
  } catch {
    return null;
  }
}

function waitForOpen(socket: WsClient, url: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`realtime connection timed out: url=${url} state=${socket.readyState}`));
    }, timeoutMs);
    socket.once('open', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

export class RealtimeTestClient {
  readonly url: string;
  private readonly defaultTimeoutMs: number;
  private readonly socket: WsClient;
  private readonly messages: MessageBuffer;
  private readonly recentMessages: RealtimeMessage[] = [];
  private readonly messageCounts = new Map<string, number>();
  private readonly onMessage: (raw: RawData) => void;
  private readonly serverDiagnostics: (() => string) | undefined;

  private constructor(socket: WsClient, options: RealtimeTestClientOptions) {
    this.socket = socket;
    this.url = options.url;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 15000;
    this.serverDiagnostics = options.serverDiagnostics;
    this.messages = createMessageBuffer(socket, this.defaultTimeoutMs);
    this.onMessage = (raw) => {
      const message = parseMessage(raw);
      if (!message) return;
      this.messageCounts.set(message.type, (this.messageCounts.get(message.type) ?? 0) + 1);
      this.recentMessages.push(message);
      if (this.recentMessages.length > 100) this.recentMessages.shift();
    };
    socket.on('message', this.onMessage);
  }

  static async connect(options: RealtimeTestClientOptions): Promise<RealtimeTestClient> {
    const socket = new WsClient(`${options.url}?token=${encodeURIComponent(options.token)}`);
    const client = new RealtimeTestClient(socket, options);
    try {
      await waitForOpen(socket, options.url, options.defaultTimeoutMs ?? 15000);
      return client;
    } catch (error) {
      client.close();
      throw new Error(
        `realtime authentication/connect failed: url=${options.url}; ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  subscribe(channels: string[]): void {
    this.send({ type: 'subscribe', channels });
  }

  async subscribeAndWait(
    channels: string[],
    expectedEvent: string,
    predicate?: MessagePredicate,
    timeoutMs = this.defaultTimeoutMs,
  ): Promise<RealtimeMessage> {
    const eventPromise = this.waitForMessage(
      `subscription ${channels.join(',')} -> ${expectedEvent}`,
      (message) =>
        message.type === 'error' ||
        (message.type === expectedEvent && (predicate?.(message) ?? true)),
      timeoutMs,
    );
    this.subscribe(channels);
    const message = await eventPromise;
    if (message.type === 'error') {
      throw new Error(`subscription rejected by realtime: ${describeServerError(message)}`);
    }
    return message;
  }

  async sendCommandAndAwaitResult({
    command,
    expectedEvent,
    predicate,
    timeoutMs = this.defaultTimeoutMs,
  }: SendAndAwaitOptions): Promise<RealtimeMessage> {
    const resultPromise = this.waitForMessage(
      `command -> ${expectedEvent}`,
      (message) =>
        message.type === 'error' ||
        (message.type === expectedEvent && (predicate?.(message) ?? true)),
      timeoutMs,
    );
    this.send(command);
    const message = await resultPromise;
    if (message.type === 'error') {
      throw new Error(`command rejected by realtime: ${describeServerError(message)}`);
    }
    return message;
  }

  async waitForMessage(
    expected: string,
    predicate: MessagePredicate,
    timeoutMs = this.defaultTimeoutMs,
  ): Promise<RealtimeMessage> {
    try {
      return await this.messages.waitForMessage(predicate, timeoutMs);
    } catch (error) {
      throw new Error(
        `${expected} failed: ${error instanceof Error ? error.message : String(error)}; ${this.diagnostics()}`,
      );
    }
  }

  observeMessages(predicate: MessagePredicate, observationMs: number): Promise<RealtimeMessage[]> {
    return new Promise((resolve) => {
      const matches: RealtimeMessage[] = [];
      const listener = (raw: RawData): void => {
        const message = parseMessage(raw);
        if (message && predicate(message)) matches.push(message);
      };
      this.socket.on('message', listener);
      setTimeout(() => {
        this.socket.off('message', listener);
        resolve(matches);
      }, observationMs);
    });
  }

  async reconnect(): Promise<RealtimeTestClient> {
    this.close();
    const token = new URL(this.socket.url).searchParams.get('token');
    if (!token) throw new Error(`realtime reconnect failed: token missing; ${this.diagnostics()}`);
    return RealtimeTestClient.connect({
      token,
      url: this.url,
      defaultTimeoutMs: this.defaultTimeoutMs,
      ...(this.serverDiagnostics ? { serverDiagnostics: this.serverDiagnostics } : {}),
    });
  }

  close(): void {
    this.messages.dispose();
    this.socket.off('message', this.onMessage);
    if (
      this.socket.readyState === WsClient.OPEN ||
      this.socket.readyState === WsClient.CONNECTING
    ) {
      this.socket.close();
    }
  }

  private send(command: unknown): void {
    if (this.socket.readyState !== WsClient.OPEN) {
      throw new Error(`cannot send realtime command; ${this.diagnostics()}`);
    }
    this.socket.send(JSON.stringify(command));
  }

  private diagnostics(): string {
    const events = this.recentMessages.map((message) => {
      const correlation = message.correlationId ? `[${message.correlationId}]` : '';
      return message.type === 'error'
        ? `${message.type}${correlation}{${describeServerError(message)}}`
        : `${message.type}${correlation}`;
    });
    const counts = [...this.messageCounts.entries()]
      .map(([type, count]) => `${type}:${count}`)
      .join(',');
    const serverLogs = this.serverDiagnostics?.().slice(-4000).trim();
    return `url=${this.url} state=${this.socket.readyState} eventCounts=${counts || 'none'} recentEvents=${events.join(',') || 'none'}${serverLogs ? `\n--- realtime logs ---\n${serverLogs}` : ''}`;
  }
}
