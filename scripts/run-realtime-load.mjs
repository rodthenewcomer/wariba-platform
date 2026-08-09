import { spawn } from 'node:child_process';

const wsUrl = new URL(process.env.NEXT_PUBLIC_REALTIME_WS_URL ?? 'ws://127.0.0.1:4001/ws');
if (!['127.0.0.1', 'localhost'].includes(wsUrl.hostname)) {
  throw new Error(
    `Load tests are restricted to local realtime targets, received ${wsUrl.hostname}.`,
  );
}
const healthUrl = new URL('/health', wsUrl);
healthUrl.protocol = wsUrl.protocol === 'wss:' ? 'https:' : 'http:';

async function isHealthy() {
  try {
    const response = await fetch(healthUrl);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForHealthy(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isHealthy()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Realtime did not become healthy at ${healthUrl} within ${timeoutMs}ms.`);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else
        reject(new Error(`${command} exited with code ${String(code)} signal ${String(signal)}`));
    });
  });
}

const serviceWasRunning = await isHealthy();
const service = serviceWasRunning
  ? null
  : spawn('pnpm', ['--filter', '@wariba/realtime', 'start'], {
      stdio: ['ignore', 'inherit', 'inherit'],
      env: process.env,
    });

try {
  await waitForHealthy(30_000);
  await run('pnpm', ['--filter', '@wariba/realtime', 'test:load'], { env: process.env });
} finally {
  service?.kill('SIGTERM');
}
