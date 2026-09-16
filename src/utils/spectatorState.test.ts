import { describe, it, expect } from 'vitest';
import { encodeSpectatorSnapshot, decodeSpectatorSnapshot, parseSpectatorHash } from './spectatorState';

describe('spectator snapshot encoding', () => {
  it('round-trips a score snapshot', () => {
    const snap = {
      v: 1 as const,
      us: 'Disco',
      them: 'Away',
      s1: 7,
      s2: 5,
      point: 13,
      line: ['Ada', 'Bo'],
      next: ['Cy'],
    };
    const decoded = decodeSpectatorSnapshot(encodeSpectatorSnapshot(snap));
    expect(decoded).toEqual(snap);
  });

  it('reads a watch hash', () => {
    const snap = {
      v: 1 as const,
      us: 'A',
      them: 'B',
      s1: 1,
      s2: 0,
      point: 2,
      line: [],
      next: [],
    };
    const hash = `#watch=${encodeSpectatorSnapshot(snap)}`;
    expect(parseSpectatorHash(hash)?.s1).toBe(1);
  });
});
