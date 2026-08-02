#!/usr/bin/env node
/**
 * Import-boundary check.
 * AGENTS.md §7.1 / Engineering Constitution §6.2 — "frontend → database package : interdit".
 * Extend this script as new boundary rules are added (Support → trading repository, etc.)
 * once those modules exist.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const FORBIDDEN = [
  {
    fromDir: 'apps/web',
    forbiddenImport: '@wariba/database',
    reason: 'frontend → database package est interdit (AGENTS.md §7.1).',
  },
];

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'build', '.turbo', 'coverage']);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, files);
    } else if (SOURCE_EXTENSIONS.has(extname(full))) {
      files.push(full);
    }
  }
  return files;
}

let violations = [];

for (const rule of FORBIDDEN) {
  let files;
  try {
    files = walk(rule.fromDir);
  } catch {
    continue; // directory doesn't exist yet in this checkout — nothing to check
  }
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    if (content.includes(rule.forbiddenImport)) {
      violations.push(`${file}: imports "${rule.forbiddenImport}" — ${rule.reason}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Import boundary violations found:\n');
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log('Import boundaries: OK (no violations found).');
