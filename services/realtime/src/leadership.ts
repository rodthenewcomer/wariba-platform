import {
  acquireOrRenewRealtimeLeadership,
  expireRealtimeLeadership,
  type Db,
  type LeadershipToken,
  type RealtimeLeadershipState,
} from '@wariba/database';
import type { Logger } from '@wariba/observability';

export interface LeadershipReadiness {
  instanceId: string;
  role: 'leader' | 'standby' | 'unavailable';
  leader: boolean;
  standbyReady: boolean;
  safeToAcceptTradingTraffic: boolean;
  fencingEpoch: string | null;
  leaseExpiresAt: string | null;
  takeoverCount: number;
  lastTakeoverDurationMs: number | null;
}

export class RealtimeLeadershipCoordinator {
  private token: LeadershipToken | null = null;
  private state: RealtimeLeadershipState | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private refreshInFlight = false;
  private lastObservedLeaderLossAt: number | null = null;
  private lastTakeoverDurationMs: number | null = null;

  constructor(
    private readonly db: Db,
    private readonly params: {
      instanceId: string;
      leaseDurationMs: number;
      renewIntervalMs: number;
      logger: Logger;
    },
  ) {}

  async start(): Promise<void> {
    await this.refresh();
    this.timer = setInterval(() => void this.refresh(), this.params.renewIntervalMs);
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const token = this.token;
    this.token = null;
    if (token) await expireRealtimeLeadership(this.db, token).catch(() => false);
  }

  currentToken(): LeadershipToken | null {
    if (!this.token || this.token.leaseExpiresAt.getTime() <= Date.now()) return null;
    return this.token;
  }

  readiness(): LeadershipReadiness {
    const token = this.currentToken();
    const role = token ? 'leader' : this.state ? 'standby' : 'unavailable';
    return {
      instanceId: this.params.instanceId,
      role,
      leader: role === 'leader',
      standbyReady: role === 'standby',
      safeToAcceptTradingTraffic: role !== 'unavailable',
      fencingEpoch: token?.fencingEpoch ?? this.state?.fencingEpoch ?? null,
      leaseExpiresAt:
        token?.leaseExpiresAt.toISOString() ?? this.state?.leaseExpiresAt.toISOString() ?? null,
      takeoverCount: this.state?.takeoverCount ?? 0,
      lastTakeoverDurationMs: this.lastTakeoverDurationMs,
    };
  }

  private async refresh(): Promise<void> {
    if (this.refreshInFlight) return;
    this.refreshInFlight = true;
    try {
      const wasLeader = this.currentToken() !== null;
      const result = await acquireOrRenewRealtimeLeadership(this.db, {
        instanceId: this.params.instanceId,
        leaseDurationMs: this.params.leaseDurationMs,
      });
      this.state = result.state;
      this.token = result.token;
      if (wasLeader && result.role !== 'leader') {
        this.lastObservedLeaderLossAt = Date.now();
        this.params.logger.warn('realtime.leadership_lost', {
          instanceId: this.params.instanceId,
          fencingEpoch: result.state.fencingEpoch,
        });
      }
      if (!wasLeader && result.role === 'leader') {
        this.lastTakeoverDurationMs = this.lastObservedLeaderLossAt
          ? Date.now() - this.lastObservedLeaderLossAt
          : 0;
        this.lastObservedLeaderLossAt = null;
        this.params.logger.info('realtime.leadership_acquired', {
          instanceId: this.params.instanceId,
          fencingEpoch: result.token.fencingEpoch,
          takeoverCount: result.state.takeoverCount,
          takeoverDurationMs: this.lastTakeoverDurationMs,
        });
      }
    } catch (error) {
      if (this.currentToken() === null) this.token = null;
      this.params.logger.error('realtime.leadership_refresh_failed', {
        instanceId: this.params.instanceId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.refreshInFlight = false;
    }
  }
}
