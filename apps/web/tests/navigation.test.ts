import { describe, expect, it } from 'vitest';
import { safeInternalPath } from '../lib/navigation';

describe('safeInternalPath', () => {
  it('preserves an internal checkout query string', () => {
    expect(safeInternalPath('/checkout?product=100K')).toBe('/checkout?product=100K');
  });

  it.each(['https://evil.invalid', '//evil.invalid/path', '/\\evil.invalid/path', 'javascript:x'])(
    'rejects external or malformed destination %s',
    (destination) => {
      expect(safeInternalPath(destination)).toBe('/hub');
    },
  );
});
