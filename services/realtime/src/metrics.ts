export interface RealtimeMetricsSnapshot {
  connectedClients: number;
  connectionsTotal: number;
  reconnects: number;
  acceptedTicks: number;
  duplicateTicks: number;
  outOfOrderTicks: number;
  nonOpenTicks: number;
  commandsReceived: number;
  commandsRejected: number;
  fills: number;
  pendingTriggers: number;
  pendingTriggerFailures: number;
  protectionTriggers: number;
  alertNotifications: number;
  queuedReductions: number;
  historyReads: number;
  historyReadFailures: number;
  historyBarsReturned: number;
  historyCacheHits: number;
  historyCacheMisses: number;
  historyGapsDetected: number;
  historyFlushBars: number;
  historyFlushFailures: number;
  historyLatencyMs: { p50: number; p95: number; p99: number };
  commandLatencyMs: { p50: number; p95: number; p99: number };
}

function percentile(values: readonly number[], quantile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1);
  return Math.round((sorted[index] ?? 0) * 100) / 100;
}

export class RealtimeOperationalMetrics {
  private connectedClients = 0;
  private connectionsTotal = 0;
  private reconnects = 0;
  private acceptedTicks = 0;
  private duplicateTicks = 0;
  private outOfOrderTicks = 0;
  private nonOpenTicks = 0;
  private commandsReceived = 0;
  private commandsRejected = 0;
  private fills = 0;
  private pendingTriggers = 0;
  private pendingTriggerFailures = 0;
  private protectionTriggers = 0;
  private alertNotifications = 0;
  private queuedReductions = 0;
  private historyReads = 0;
  private historyReadFailures = 0;
  private historyBarsReturned = 0;
  private historyCacheHits = 0;
  private historyCacheMisses = 0;
  private historyGapsDetected = 0;
  private historyFlushBars = 0;
  private historyFlushFailures = 0;
  private readonly observedUsers = new Set<string>();
  private readonly commandLatenciesMs: number[] = [];
  private readonly historyLatenciesMs: number[] = [];

  connectionOpened(userId: string): void {
    this.connectedClients += 1;
    this.connectionsTotal += 1;
    if (this.observedUsers.has(userId)) this.reconnects += 1;
    this.observedUsers.add(userId);
  }

  connectionClosed(): void {
    this.connectedClients = Math.max(0, this.connectedClients - 1);
  }

  tick(decision: 'accepted' | 'duplicate' | 'out_of_order' | 'not_open'): void {
    if (decision === 'accepted') this.acceptedTicks += 1;
    if (decision === 'duplicate') this.duplicateTicks += 1;
    if (decision === 'out_of_order') this.outOfOrderTicks += 1;
    if (decision === 'not_open') this.nonOpenTicks += 1;
  }

  commandReceived(): void {
    this.commandsReceived += 1;
  }

  commandRejected(): void {
    this.commandsRejected += 1;
  }

  observeCommandLatency(durationMs: number): void {
    this.commandLatenciesMs.push(Math.max(0, durationMs));
    if (this.commandLatenciesMs.length > 2_048) this.commandLatenciesMs.shift();
  }

  addFills(count: number): void {
    this.fills += count;
  }

  addPendingTriggers(count: number): void {
    this.pendingTriggers += count;
  }

  pendingTriggerFailed(): void {
    this.pendingTriggerFailures += 1;
  }

  addProtectionTriggers(count: number): void {
    this.protectionTriggers += count;
  }

  addAlertNotifications(count: number): void {
    this.alertNotifications += count;
  }

  addQueuedReductions(count: number): void {
    this.queuedReductions += count;
  }

  historyRead(result: {
    bars: number;
    durationMs: number;
    ok: boolean;
    cacheHit?: boolean;
    gapsDetected?: number;
  }): void {
    this.historyReads += 1;
    this.historyBarsReturned += result.bars;
    if (!result.ok) this.historyReadFailures += 1;
    if (result.cacheHit === true) this.historyCacheHits += 1;
    if (result.cacheHit === false) this.historyCacheMisses += 1;
    this.historyGapsDetected += Math.max(0, result.gapsDetected ?? 0);
    this.historyLatenciesMs.push(Math.max(0, result.durationMs));
    if (this.historyLatenciesMs.length > 2_048) this.historyLatenciesMs.shift();
  }

  historyFlush(result: { bars: number; durationMs: number; ok: boolean }): void {
    this.historyFlushBars += result.bars;
    if (!result.ok) this.historyFlushFailures += 1;
    this.historyLatenciesMs.push(Math.max(0, result.durationMs));
    if (this.historyLatenciesMs.length > 2_048) this.historyLatenciesMs.shift();
  }

  snapshot(): RealtimeMetricsSnapshot {
    return {
      connectedClients: this.connectedClients,
      connectionsTotal: this.connectionsTotal,
      reconnects: this.reconnects,
      acceptedTicks: this.acceptedTicks,
      duplicateTicks: this.duplicateTicks,
      outOfOrderTicks: this.outOfOrderTicks,
      nonOpenTicks: this.nonOpenTicks,
      commandsReceived: this.commandsReceived,
      commandsRejected: this.commandsRejected,
      fills: this.fills,
      pendingTriggers: this.pendingTriggers,
      pendingTriggerFailures: this.pendingTriggerFailures,
      protectionTriggers: this.protectionTriggers,
      alertNotifications: this.alertNotifications,
      queuedReductions: this.queuedReductions,
      historyReads: this.historyReads,
      historyReadFailures: this.historyReadFailures,
      historyBarsReturned: this.historyBarsReturned,
      historyCacheHits: this.historyCacheHits,
      historyCacheMisses: this.historyCacheMisses,
      historyGapsDetected: this.historyGapsDetected,
      historyFlushBars: this.historyFlushBars,
      historyFlushFailures: this.historyFlushFailures,
      historyLatencyMs: {
        p50: percentile(this.historyLatenciesMs, 0.5),
        p95: percentile(this.historyLatenciesMs, 0.95),
        p99: percentile(this.historyLatenciesMs, 0.99),
      },
      commandLatencyMs: {
        p50: percentile(this.commandLatenciesMs, 0.5),
        p95: percentile(this.commandLatenciesMs, 0.95),
        p99: percentile(this.commandLatenciesMs, 0.99),
      },
    };
  }
}
