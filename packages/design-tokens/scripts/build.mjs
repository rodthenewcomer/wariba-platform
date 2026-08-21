#!/usr/bin/env node
/**
 * Resolves docs/05-design/tokens.json (DTCG-style, with {alias} references)
 * into packages/design-tokens/src/tokens.css (CSS custom properties, light +
 * dark) and packages/design-tokens/src/tokens.generated.ts (typed raw values).
 *
 * Run via `pnpm --filter @wariba/design-tokens build`. Source of truth is the
 * JSON — never hand-edit the generated files.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const tokensPath = path.join(repoRoot, 'docs/05-design/tokens.json');
const raw = JSON.parse(readFileSync(tokensPath, 'utf8'));

const ALIAS_RE = /^\{([^}]+)\}$/;

function get(obj, dotted) {
  return dotted.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

// Single consistent resolver: unwraps {$type,$value} leaves (at any depth),
// follows {alias.path} string references, recurses through arrays/objects.
function resolve(node, seen = []) {
  if (node && typeof node === 'object' && !Array.isArray(node) && '$value' in node) {
    return resolve(node.$value, seen);
  }
  if (typeof node === 'string') {
    const m = node.match(ALIAS_RE);
    if (m) {
      const target = get(raw, m[1]);
      if (target === undefined) throw new Error(`Unresolved alias: ${node}`);
      if (seen.includes(m[1])) throw new Error(`Alias cycle: ${[...seen, m[1]].join(' -> ')}`);
      return resolve(target, [...seen, m[1]]);
    }
    return node;
  }
  if (Array.isArray(node)) {
    return node.map((v) => resolve(v, seen));
  }
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = resolve(v, seen);
    return out;
  }
  return node;
}

// Back-compat alias used a few places below for resolving a raw (non-leaf) subtree.
function resolveValue(node) {
  return resolve(node);
}

// Walk a tree of {$type,$value} leaves into a flat map of dotted-path -> resolved value
function flatten(node, prefix, out) {
  if (node && typeof node === 'object' && '$value' in node) {
    out[prefix] = resolve(node);
    return;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
  }
}

function kebab(dotted) {
  return dotted
    .replace(/\./g, '-')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

function shadowToCss(layers) {
  if (!Array.isArray(layers) || layers.length === 0) return 'none';
  return layers.map((l) => `${l.offsetX} ${l.offsetY} ${l.blur} ${l.spread} ${l.color}`).join(', ');
}

const flat = {};
flatten(raw, '', flat);
delete flat['']; // metadata/guardrails root noise, re-derived below explicitly

const colorPrimitive = {};
flatten(raw.color.primitive, '', colorPrimitive);
const semanticLight = {};
flatten(raw.color.semantic.light, '', semanticLight);
const semanticDark = {};
flatten(raw.color.semantic.dark, '', semanticDark);
const status = {};
flatten(raw.color.semantic.status, '', status);

const space = {};
flatten(raw.space, '', space);
const radius = {};
flatten(raw.radius, '', radius);
const borderWidth = {};
flatten(raw.border.width, '', borderWidth);
const sizeTok = {};
flatten(raw.size, '', sizeTok);
const zIndex = {};
flatten(raw.zIndex, '', zIndex);
const opacity = {};
flatten(raw.opacity, '', opacity);
const breakpoint = {};
flatten(raw.breakpoint, '', breakpoint);
const motionDuration = {};
flatten(raw.motion.duration, '', motionDuration);
const fontSize = {};
flatten(raw.font.size, '', fontSize);
const lineHeight = {};
flatten(raw.font.lineHeight, '', lineHeight);
const letterSpacing = {};
flatten(raw.font.letterSpacing, '', letterSpacing);
const fontWeight = {};
flatten(raw.font.weight, '', fontWeight);
const chart = {};
flatten(raw.chart, '', chart);

const lines = [];
lines.push('/* GENERATED — do not edit by hand. Source: docs/05-design/tokens.json */');
lines.push('/* Regenerate: pnpm --filter @wariba/design-tokens build */');
lines.push('');
lines.push(':root {');
lines.push(
  `  --wariba-font-sans: ${resolve(raw.font.family.sans)
    .map((f) => (f.includes(' ') ? `"${f}"` : f))
    .join(', ')};`,
);
lines.push(
  `  --wariba-font-mono: ${resolve(raw.font.family.mono)
    .map((f) => (f.includes(' ') ? `"${f}"` : f))
    .join(', ')};`,
);
for (const [k, v] of Object.entries(fontWeight))
  lines.push(`  --wariba-font-weight-${kebab(k)}: ${v};`);
for (const [k, v] of Object.entries(fontSize))
  lines.push(`  --wariba-font-size-${kebab(k)}: ${v};`);
for (const [k, v] of Object.entries(lineHeight))
  lines.push(`  --wariba-line-height-${kebab(k)}: ${v};`);
for (const [k, v] of Object.entries(letterSpacing))
  lines.push(`  --wariba-letter-spacing-${kebab(k)}: ${v};`);
const fontNumeric = {};
flatten(raw.font.numeric, '', fontNumeric);
for (const [k, v] of Object.entries(fontNumeric))
  lines.push(`  --wariba-font-numeric-${kebab(k)}: ${v};`);
lines.push('');
for (const [k, v] of Object.entries(colorPrimitive))
  lines.push(`  --wariba-color-${kebab(k)}: ${v};`);
lines.push('');
for (const [k, v] of Object.entries(space)) lines.push(`  --wariba-space-${kebab(k)}: ${v};`);
for (const [k, v] of Object.entries(radius)) lines.push(`  --wariba-radius-${kebab(k)}: ${v};`);
for (const [k, v] of Object.entries(borderWidth))
  lines.push(`  --wariba-border-width-${kebab(k)}: ${v};`);
for (const [k, v] of Object.entries(sizeTok)) lines.push(`  --wariba-size-${kebab(k)}: ${v};`);
for (const [k, v] of Object.entries(zIndex)) lines.push(`  --wariba-z-${kebab(k)}: ${v};`);
for (const [k, v] of Object.entries(opacity)) lines.push(`  --wariba-opacity-${kebab(k)}: ${v};`);
for (const [k, v] of Object.entries(breakpoint))
  lines.push(`  --wariba-breakpoint-${kebab(k)}: ${v};`);
for (const [k, v] of Object.entries(motionDuration))
  lines.push(`  --wariba-motion-duration-${kebab(k)}: ${v};`);
for (const [name, val] of Object.entries(resolveValue(raw.motion.easing, []))) {
  lines.push(`  --wariba-motion-ease-${kebab(name)}: cubic-bezier(${val.join(', ')});`);
}
lines.push(`  --wariba-motion-duration-reduced: ${resolve(raw.motion.reducedMotion.duration)};`);
lines.push('');
const shadow = raw.shadow;
for (const [name, node] of Object.entries(shadow)) {
  lines.push(`  --wariba-shadow-${kebab(name)}: ${shadowToCss(resolve(node))};`);
}
lines.push('');
for (const [k, v] of Object.entries(chart)) lines.push(`  --wariba-chart-${kebab(k)}: ${v};`);
lines.push('');
lines.push('  /* Semantic — light (default) */');
for (const [k, v] of Object.entries(semanticLight)) lines.push(`  --wariba-${kebab(k)}: ${v};`);
lines.push('');
lines.push('  /* Status — theme-independent */');
for (const [k, v] of Object.entries(status)) lines.push(`  --wariba-status-${kebab(k)}: ${v};`);
lines.push('}');
lines.push('');
lines.push('@media (prefers-color-scheme: dark) {');
lines.push('  :root:not([data-theme="light"]) {');
for (const [k, v] of Object.entries(semanticDark)) lines.push(`    --wariba-${kebab(k)}: ${v};`);
lines.push('  }');
lines.push('}');
lines.push('');
lines.push('[data-theme="dark"] {');
for (const [k, v] of Object.entries(semanticDark)) lines.push(`  --wariba-${kebab(k)}: ${v};`);
lines.push('}');
lines.push('');
lines.push('[data-theme="light"] {');
for (const [k, v] of Object.entries(semanticLight)) lines.push(`  --wariba-${kebab(k)}: ${v};`);
lines.push('}');
lines.push('');

// Component tokens (button, input, card, dialog, bottomSheet, badge, riskRibbon,
// missionProgress, consistencyMeter, payoutBreakdown, trade, control) — resolved refs
lines.push(':root {');
function flattenComponent(node, prefix, out) {
  flatten(node, prefix, out);
}
const component = {};
flattenComponent(raw.component, '', component);
for (const [k, v] of Object.entries(component)) {
  const cssVal = Array.isArray(v) ? shadowToCss(v) : v;
  lines.push(`  --wariba-component-${kebab(k)}: ${cssVal};`);
}
lines.push('}');
lines.push('');

// Trade / Control fixed dark|light theme surfaces (explicit, not user-togglable)
lines.push('[data-wariba-theme="trade"] {');
for (const [k, v] of Object.entries(resolveValue(raw.theme.trade, []))) {
  if (typeof v === 'string') lines.push(`  --wariba-theme-${kebab(k)}: ${v};`);
}
lines.push('}');
lines.push('');
lines.push('[data-wariba-theme="control"] {');
for (const [k, v] of Object.entries(resolveValue(raw.theme.control, []))) {
  if (typeof v === 'string') lines.push(`  --wariba-theme-${kebab(k)}: ${v};`);
}
lines.push('}');
lines.push('');
lines.push('[data-wariba-theme="marketing"] {');
for (const [k, v] of Object.entries(resolveValue(raw.theme.marketing, []))) {
  if (typeof v === 'string') lines.push(`  --wariba-theme-${kebab(k)}: ${v};`);
}
lines.push('}');
lines.push('');

// Tailwind v4 @theme mapping — utilities read straight from the vars above,
// so `bg-cobalt-500`, `text-ink-950`, `font-sans`, `rounded-lg` etc. use our exact tokens.
lines.push('@theme inline {');
lines.push('  --font-sans: var(--wariba-font-sans);');
lines.push('  --font-mono: var(--wariba-font-mono);');
for (const k of Object.keys(colorPrimitive)) {
  lines.push(`  --color-${kebab(k)}: var(--wariba-color-${kebab(k)});`);
}
// Note: WARIBA's space scale (space.1=4px, space.2=8px, ... space.4=16px, step=4px)
// is numerically identical to Tailwind's default spacing scale (n * 0.25rem), so
// plain utilities (p-4, gap-6, mt-8...) already match the tokens without remapping.
for (const k of Object.keys(radius)) {
  lines.push(`  --radius-${kebab(k)}: var(--wariba-radius-${kebab(k)});`);
}
// Literal values, not var(...) — Tailwind expands --breakpoint-* into @media
// queries, and custom properties don't resolve inside a media condition.
for (const [k, v] of Object.entries(breakpoint)) {
  lines.push(`  --breakpoint-${kebab(k)}: ${v};`);
}
for (const k of Object.keys(shadow)) {
  lines.push(`  --shadow-${kebab(k)}: var(--wariba-shadow-${kebab(k)});`);
}
lines.push('}');

writeFileSync(path.join(here, '../src/tokens.css'), lines.join('\n') + '\n');

// Typed TS export of resolved raw values, for programmatic use (e.g. non-CSS contexts)
const ts = [];
ts.push('/* GENERATED — do not edit by hand. Source: docs/05-design/tokens.json */');
ts.push('/* Regenerate: pnpm --filter @wariba/design-tokens build */');
ts.push('');
ts.push(`export const color = ${JSON.stringify(colorPrimitive, null, 2)} as const;`);
ts.push(`export const semanticLight = ${JSON.stringify(semanticLight, null, 2)} as const;`);
ts.push(`export const semanticDark = ${JSON.stringify(semanticDark, null, 2)} as const;`);
ts.push(`export const status = ${JSON.stringify(status, null, 2)} as const;`);
ts.push(`export const space = ${JSON.stringify(space, null, 2)} as const;`);
ts.push(`export const radius = ${JSON.stringify(radius, null, 2)} as const;`);
ts.push(`export const breakpoint = ${JSON.stringify(breakpoint, null, 2)} as const;`);
ts.push(`export const motionDuration = ${JSON.stringify(motionDuration, null, 2)} as const;`);
ts.push(`export const zIndexToken = ${JSON.stringify(zIndex, null, 2)} as const;`);
ts.push(`export const chart = ${JSON.stringify(chart, null, 2)} as const;`);
writeFileSync(path.join(here, '../src/tokens.generated.ts'), ts.join('\n') + '\n');

console.warn('Generated tokens.css and tokens.generated.ts from docs/05-design/tokens.json');
console.warn(
  `  colors: ${Object.keys(colorPrimitive).length}, semantic(light): ${Object.keys(semanticLight).length}, space: ${Object.keys(space).length}`,
);
