import { describe, it, expect } from 'vitest';
import { initials, formatDate, relativeTime } from './format';

describe('initials', () => {
  it('takes first two words', () => {
    expect(initials('Budi Santoso')).toBe('BS');
  });
  it('handles single word', () => {
    expect(initials('Admin')).toBe('A');
  });
});

describe('formatDate', () => {
  it('returns dash for empty', () => {
    expect(formatDate(null)).toBe('-');
  });
  it('formats an ISO date', () => {
    expect(formatDate('2025-01-15T00:00:00Z')).toContain('2025');
  });
});

describe('relativeTime', () => {
  it('reports just now for recent timestamps', () => {
    expect(relativeTime(new Date().toISOString())).toBe('baru saja');
  });
  it('reports minutes for older timestamps', () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60000).toISOString();
    expect(relativeTime(tenMinAgo)).toMatch(/menit/);
  });
});
