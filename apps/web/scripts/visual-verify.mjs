#!/usr/bin/env node
/**
 * One-off visual + accessibility verification for Prompt 02 — not part of the
 * regular test suite (that's E2E's job in a later prompt). Captures real
 * screenshots at the required breakpoints and runs axe against each page.
 * Requires the dev server already running on :3000.
 */
import { AxeBuilder } from '@axe-core/playwright';
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:3000';
const OUT_DIR = new URL('../.visual-verify', import.meta.url).pathname;
mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORTS = [
  { name: '320', width: 320, height: 640 },
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1280', width: 1280, height: 800 },
  { name: '1440', width: 1440, height: 900 },
];

const PAGES = [
  { name: 'homepage', path: '/' },
  { name: 'hub', path: '/hub' },
  { name: 'trade', path: '/trade' },
  { name: 'catalog', path: '/catalog' },
];

const browser = await chromium.launch();
let axeIssues = 0;

for (const page of PAGES) {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const tab = await context.newPage();
    await tab.goto(`${BASE}${page.path}`, { waitUntil: 'networkidle' });
    await tab.screenshot({ path: `${OUT_DIR}/${page.name}-${viewport.name}.png`, fullPage: true });

    if (viewport.name === '1280') {
      const results = await new AxeBuilder({ page: tab }).analyze();
      const critical = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      if (critical.length > 0) {
        axeIssues += critical.length;
        console.warn(`axe [${page.name}]: ${critical.length} critical/serious violation(s)`);
        for (const v of critical) {
          console.warn(`  - ${v.id}: ${v.description} (${v.nodes.length} node(s))`);
        }
      } else {
        console.warn(
          `axe [${page.name}]: 0 critical/serious violations (${results.violations.length} minor)`,
        );
      }
    }

    await context.close();
  }
}

await browser.close();
console.warn(`\nScreenshots written to ${OUT_DIR}`);
console.warn(`Total critical/serious axe violations across all pages: ${axeIssues}`);
process.exit(axeIssues > 0 ? 1 : 0);
