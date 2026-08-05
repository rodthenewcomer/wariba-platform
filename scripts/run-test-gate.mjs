import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const separatorIndex = process.argv.indexOf('--');
if (separatorIndex < 0) {
  throw new Error('run-test-gate requires `--` before the command.');
}

if (existsSync('.env.local')) {
  process.loadEnvFile('.env.local');
}

const requiredNames = process.argv.slice(2, separatorIndex);
const missingNames = requiredNames.filter((name) => !process.env[name]?.trim());
if (missingNames.length > 0) {
  process.stderr.write(
    `Refusing to skip a required test gate. Missing environment variables: ${missingNames.join(', ')}\n`,
  );
  process.exit(1);
}

const [command, ...args] = process.argv.slice(separatorIndex + 1);
if (!command) throw new Error('run-test-gate requires a command after `--`.');

const result = spawnSync(command, args, { env: process.env, stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
