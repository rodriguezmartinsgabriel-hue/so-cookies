import { describe, it, expect } from 'vitest';
import { createId } from './ids';

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('createId', () => {
  it('returns a valid UUID v4', () => {
    expect(createId()).toMatch(UUID_V4_RE);
  });

  it('returns unique values', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => createId()));
    expect(ids.size).toBe(1000);
  });
});
