import { describe, it, expect } from 'vitest';
import { getLine, getWrapped } from './lineRotation';
import type { Player } from '../types';

const o = (name: string): Player => ({
  uuid: `o-${name}`,
  name,
  gender: 'O',
  number: 0,
});
const w = (name: string): Player => ({
  uuid: `w-${name}`,
  name,
  gender: 'W',
  number: 0,
});

describe('getWrapped', () => {
  it('returns count elements wrapping from start', () => {
    const q = [o('A'), o('B'), o('C'), o('D')];
    expect(getWrapped(q, 2, 3).map((p) => p.name)).toEqual(['C', 'D', 'A']);
  });

  it('when count >= queue length, returns full queue once (no wrap duplication)', () => {
    const q = [o('A'), o('B')];
    expect(getWrapped(q, 0, 4).map((p) => p.name)).toEqual(['A', 'B']);
  });
});

describe('getLine', () => {
  it('concatenates open slice then women slice for 4-3 at 7v7', () => {
    const opens = [o('A'), o('B'), o('C'), o('D')];
    const women = [w('M'), w('N'), w('P')];
    const line = getLine(opens, women, { men: 4, women: 3 }, 0, 0);
    expect(line.map((p) => p.name)).toEqual(['A', 'B', 'C', 'D', 'M', 'N', 'P']);
  });

  it('respects separate open and women start indices', () => {
    const opens = [o('A'), o('B'), o('C')];
    const women = [w('M'), w('N')];
    const line = getLine(opens, women, { men: 2, women: 2 }, 1, 1);
    expect(line.map((p) => p.name)).toEqual(['B', 'C', 'M', 'N']);
  });
});
