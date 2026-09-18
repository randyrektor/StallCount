import { describe, it, expect } from 'vitest';
import { isSoftCapReached, parseSoftCap } from './softCap';

describe('soft point cap', () => {
  it('parses off and common rec targets', () => {
    expect(parseSoftCap('off')).toBeNull();
    expect(parseSoftCap(null)).toBeNull();
    expect(parseSoftCap(13)).toBe(13);
    expect(parseSoftCap('15')).toBe(15);
  });

  it('is reached only when a team hits the cap', () => {
    expect(isSoftCapReached(12, 10, 13)).toBe(false);
    expect(isSoftCapReached(13, 10, 13)).toBe(true);
    expect(isSoftCapReached(12, 13, 13)).toBe(true);
    expect(isSoftCapReached(15, 14, null)).toBe(false);
  });
});
