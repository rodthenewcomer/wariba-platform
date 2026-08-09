import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';

interface RealtimeTestProcessOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
  healthUrl: string;
  healthTimeoutMs?: number;
}

export interface RealtimeTestProcess {
  child: ChildProcess;
  logs(): string;
  kill(signal: NodeJS.Signals): void;
  stop(): Promise<void>;
}

export async function waitForCondition(
  description: string,
  probe: () => Promise<boolean>,
  timeoutMs = 20000,
  intervalMs = 250,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      if (await probe()) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  const errorSuffix = lastError
    ? `; lastError=${lastError instanceof Error ? lastError.message : String(lastError)}`
    : '';
  throw new Error(`${description} timed out after ${timeoutMs}ms${errorSuffix}`);
}

function waitForExit(child: ChildProcess, timeoutMs = 20000): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('timed out waiting for realtime process exit')),
      timeoutMs,
    );
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function waitForHealthy(
  child: ChildProcess,
  healthUrl: string,
  logs: () => string,
  timeoutMs: number,
): Promise<void> {
  let lastStatus = 'no response';
  try {
    await waitForCondition(
      `realtime health check ${healthUrl}`,
      async () => {
        if (child.exitCode !== null || child.signalCode !== null) {
          throw new Error(
            `process exited: code=${child.exitCode} signal=${child.signalCode}\n${logs()}`,
          );
        }
        try {
          const response = await fetch(healthUrl);
          lastStatus = `HTTP ${response.status}`;
          return response.ok;
        } catch (error) {
          lastStatus = error instanceof Error ? error.message : String(error);
          return false;
        }
      },
      timeoutMs,
    );
  } catch (error) {
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}; last=${lastStatus}\n${logs()}`,
    );
  }
}

export async function spawnRealtimeTestProcess(
  options: RealtimeTestProcessOptions,
): Promise<RealtimeTestProcess> {
  const childEnv = { ...options.env };
  delete childEnv.VITEST;
  const child = spawn(resolve(options.cwd, 'node_modules/.bin/tsx'), ['src/index.ts'], {
    cwd: options.cwd,
    env: childEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  });
  let processLogs = '';
  const appendLog = (chunk: Buffer): void => {
    processLogs = `${processLogs}${chunk.toString()}`.slice(-20000);
  };
  child.stdout?.on('data', appendLog);
  child.stderr?.on('data', appendLog);
  const logs = (): string => processLogs;
  const kill = (signal: NodeJS.Signals): void => {
    if (child.pid && process.platform !== 'win32') {
      try {
        process.kill(-child.pid, signal);
        return;
      } catch {
        // Fall back to the direct child below if the process group already exited.
      }
    }
    child.kill(signal);
  };

  try {
    await waitForHealthy(child, options.healthUrl, logs, options.healthTimeoutMs ?? 30000);
  } catch (error) {
    kill('SIGTERM');
    throw error;
  }

  return {
    child,
    logs,
    kill,
    async stop() {
      if (child.exitCode !== null || child.signalCode !== null) return;
      kill('SIGTERM');
      try {
        await waitForExit(child);
        await waitForCondition(
          `realtime shutdown ${options.healthUrl}`,
          async () => {
            try {
              await fetch(options.healthUrl);
              return false;
            } catch {
              return true;
            }
          },
          10000,
        );
      } catch (error) {
        kill('SIGKILL');
        throw new Error(
          `${error instanceof Error ? error.message : String(error)}\n--- realtime logs ---\n${logs()}`,
        );
      }
    },
  };
}
