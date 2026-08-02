import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME, color, radius, semanticDark, semanticLight, space } from '../src/index';

describe('@wariba/design-tokens', () => {
  it('exposes its package identity', () => {
    expect(PACKAGE_NAME).toBe('@wariba/design-tokens');
  });

  it('resolves primitive colors from docs/05-design/tokens.json exactly', () => {
    expect(color['cobalt.500']).toBe('#3157F5');
    expect(color['copper.500']).toBe('#BE6945');
    expect(color['ink.950']).toBe('#0B0D12');
    expect(color['bone.50']).toBe('#F7F3EB');
  });

  it('resolves semantic light/dark aliases to their primitive values', () => {
    expect(semanticLight['action.primary']).toBe(color['cobalt.500']);
    expect(semanticDark['action.primary']).toBe(color['cobalt.400']);
    expect(semanticLight['background.canvas']).toBe(color['bone.50']);
    expect(semanticDark['background.canvas']).toBe(color['ink.950']);
  });

  it('keeps the 4px spacing scale', () => {
    expect(space['1']).toBe('4px');
    expect(space['4']).toBe('16px');
    expect(space['32']).toBe('128px');
  });

  it('never exceeds the 20px radius guardrail (Design System §16, anti-vibe-code)', () => {
    for (const [key, value] of Object.entries(radius)) {
      if (key === 'full') continue; // pill shape is intentionally unbounded
      const px = Number.parseInt(value, 10);
      expect(px, `radius.${key} = ${value}`).toBeLessThanOrEqual(20);
    }
  });
});
