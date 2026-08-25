import { describe, expect, it } from 'vitest';
import {
  PASS_REVIEW_ACTION_BLOCKED_BY_PRODUCT_DECISION,
  parseControlPassReviewQuery,
} from '../src/control-pass-review';

describe('Control pass review contract', () => {
  it('parses only real operational filters and reports invalid values', () => {
    expect(parseControlPassReviewQuery({ status: 'reviewed', q: 'EVAL-001', page: '2' })).toEqual({
      filters: { status: 'reviewed', query: 'EVAL-001' },
      page: 2,
      ignored: [],
    });
    expect(parseControlPassReviewQuery({ status: 'manual_approval' }).ignored).toContain('status');
  });

  it('unblocks post-result actions without introducing pass approval authority', () => {
    expect(PASS_REVIEW_ACTION_BLOCKED_BY_PRODUCT_DECISION).toBe(false);
  });
});
