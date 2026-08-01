#!/usr/bin/env node
/**
 * Minimal secret scanner for CI.
 * Engineering Constitution §43.4 — "Secret scanning obligatoire" in CI.
 * This is a baseline pattern scan, not a replacement for a dedicated tool
 * (gitleaks/trufflehog) which should be evaluated before public launch.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PATTERNS = [
  { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'Generic private key block', regex: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  {
    name: 'Supabase service role key literal',
    regex: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"]?ey[A-Za-z0-9._-]{20,}/,
  },
  {
    name: 'Generic hardcoded secret assignment',
    regex: /(secret|password|api[_-]?key)\s*[:=]\s*['"][A-Za-z0-9/+_-]{16,}['"]/i,
  },
];

let files;
try {
  // --cached (tracked) + --others --exclude-standard (untracked but not gitignored),
  // so this catches new files before their first commit too.
  files = execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8' })
    .split('\n')
    .filter((f) => f.length > 0 && !f.endsWith('.lock') && !f.includes('secret-scan.mjs'));
} catch {
  console.error('secret-scan: not a git repository, skipping.');
  process.exit(0);
}

let violations = [];

for (const file of files) {
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue; // binary or unreadable — skip
  }
  for (const pattern of PATTERNS) {
    if (pattern.regex.test(content)) {
      violations.push(`${file}: matched pattern "${pattern.name}"`);
    }
  }
}

if (violations.length > 0) {
  console.error('Potential secrets found:\n');
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log('Secret scan: OK (no matches).');
